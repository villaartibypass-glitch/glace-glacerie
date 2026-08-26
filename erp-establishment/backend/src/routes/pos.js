const express = require("express");
const prisma = require("../prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// ---- Catalogue ----

router.get("/catalogue", async (req, res) => {
  const { establishmentId } = req.user;
  const categories = await prisma.category.findMany({
    where: { establishmentId },
    orderBy: { sortOrder: "asc" },
    include: {
      products: { where: { active: true } },
    },
  });

  const serialized = categories.map((c) => ({
    ...c,
    products: c.products.map((p) => ({ ...p, price: Number(p.price) })),
  }));

  res.json(serialized);
});

// ---- Tables ----

router.get("/tables", async (req, res) => {
  const { establishmentId } = req.user;
  const zones = await prisma.zone.findMany({
    where: { establishmentId },
    include: { tables: true },
  });
  res.json(zones);
});

// ---- Commandes ----

// Crée une nouvelle commande ouverte (sur une table ou "à emporter" si tableId absent)
router.post("/orders", async (req, res) => {
  const { establishmentId, userId } = req.user;
  const { tableId } = req.body;

  const order = await prisma.order.create({
    data: { establishmentId, userId, tableId: tableId || null, status: "OPEN" },
    include: { items: true },
  });

  if (tableId) {
    await prisma.table.update({ where: { id: tableId }, data: { status: "OCCUPIED" } });
  }

  res.status(201).json(order);
});

router.get("/orders/open", async (req, res) => {
  const { establishmentId } = req.user;
  const orders = await prisma.order.findMany({
    where: { establishmentId, status: { in: ["OPEN", "SENT", "READY"] } },
    include: { items: { include: { product: true } }, table: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
});

router.get("/orders/:id", async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { product: true } }, payments: true, table: true },
  });
  if (!order) return res.status(404).json({ error: "Commande introuvable" });
  res.json(order);
});

// Ajoute un article à la commande
router.post("/orders/:id/items", async (req, res) => {
  const { productId, quantity = 1, note } = req.body;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: "Produit introuvable" });

  const item = await prisma.orderItem.create({
    data: {
      orderId: req.params.id,
      productId,
      quantity,
      unitPrice: product.price,
      station: product.station,
      note,
    },
  });
  res.status(201).json(item);
});

router.delete("/orders/:id/items/:itemId", async (req, res) => {
  await prisma.orderItem.delete({ where: { id: req.params.itemId } });
  res.status(204).end();
});

// Envoie la commande en cuisine/bar (visible sur le Kitchen Display)
router.post("/orders/:id/send", async (req, res) => {
  const now = new Date();
  await prisma.orderItem.updateMany({
    where: { orderId: req.params.id, sentAt: null },
    data: { sentAt: now },
  });
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: "SENT" },
    include: { items: true },
  });
  res.json(order);
});

// Encaisse la commande (un ou plusieurs paiements possibles - split bill)
router.post("/orders/:id/pay", async (req, res) => {
  const { method, amount } = req.body;
  const orderId = req.params.id;

  const payment = await prisma.payment.create({
    data: { orderId, method, amount },
  });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payments: true },
  });

  const total = order.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
  const paid = order.payments.reduce((s, p) => s + Number(p.amount), 0);

  if (paid >= total) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "PAID", closedAt: new Date() },
    });
    if (order.tableId) {
      await prisma.table.update({ where: { id: order.tableId }, data: { status: "CLEANING" } });
    }
  }

  res.status(201).json({ payment, remaining: Math.max(total - paid, 0) });
});

module.exports = router;
