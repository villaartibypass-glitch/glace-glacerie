const express = require("express");
const prisma = require("../prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/dashboard/summary -> chiffres clés du jour pour l'établissement courant
router.get("/summary", async (req, res) => {
  const { establishmentId } = req.user;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [orders, payments, openTables, openOrders] = await Promise.all([
    prisma.order.findMany({
      where: { establishmentId, createdAt: { gte: startOfDay } },
      include: { items: true },
    }),
    prisma.payment.findMany({
      where: {
        order: { establishmentId },
        createdAt: { gte: startOfDay },
      },
    }),
    prisma.table.count({ where: { establishmentId, status: "OCCUPIED" } }),
    prisma.order.count({ where: { establishmentId, status: { in: ["OPEN", "SENT", "READY"] } } }),
  ]);

  const revenueToday = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const ordersToday = orders.length;
  const avgTicket = ordersToday > 0 ? revenueToday / ordersToday : 0;

  // Ventilation des ventes par heure (pour le graphe)
  const salesByHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, total: 0 }));
  for (const p of payments) {
    const h = new Date(p.createdAt).getHours();
    salesByHour[h].total += Number(p.amount);
  }

  // Top produits du jour
  const productTotals = {};
  for (const order of orders) {
    for (const item of order.items) {
      const key = item.productId;
      productTotals[key] = (productTotals[key] || 0) + item.quantity;
    }
  }
  const topProductIds = Object.entries(productTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const topProducts = topProductIds.length
    ? await prisma.product.findMany({ where: { id: { in: topProductIds } } })
    : [];

  const topProductsWithQty = topProducts.map((p) => ({
    ...p,
    price: Number(p.price),
    quantity: productTotals[p.id],
  }));

  res.json({
    revenueToday,
    ordersToday,
    avgTicket,
    openTables,
    openOrders,
    salesByHour,
    topProducts: topProductsWithQty,
  });
});

module.exports = router;
