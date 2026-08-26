const bcrypt = require("bcryptjs");
const prisma = require("./prisma");

async function main() {
  const establishment = await prisma.establishment.create({
    data: { name: "EventFlow - Établissement démo", type: "resort" },
  });

  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: {
      establishmentId: establishment.id,
      name: "Admin",
      email: "admin@eventflow.mg",
      passwordHash,
      role: "ADMIN",
    },
  });

  const catBoissons = await prisma.category.create({
    data: { establishmentId: establishment.id, name: "Boissons", color: "#2F6F6F", sortOrder: 1 },
  });
  const catPlats = await prisma.category.create({
    data: { establishmentId: establishment.id, name: "Plats", color: "#B45309", sortOrder: 2 },
  });
  const catPatisserie = await prisma.category.create({
    data: { establishmentId: establishment.id, name: "Pâtisserie", color: "#7C3AED", sortOrder: 3 },
  });

  await prisma.product.createMany({
    data: [
      { establishmentId: establishment.id, categoryId: catBoissons.id, name: "Eau minérale", price: 2000, station: "bar" },
      { establishmentId: establishment.id, categoryId: catBoissons.id, name: "THB 33cl", price: 4500, station: "bar" },
      { establishmentId: establishment.id, categoryId: catBoissons.id, name: "Jus naturel", price: 5000, station: "bar" },
      { establishmentId: establishment.id, categoryId: catPlats.id, name: "Romazava", price: 15000, station: "cuisine" },
      { establishmentId: establishment.id, categoryId: catPlats.id, name: "Poulet grillé", price: 18000, station: "cuisine" },
      { establishmentId: establishment.id, categoryId: catPlats.id, name: "Salade César", price: 12000, station: "cuisine" },
      { establishmentId: establishment.id, categoryId: catPatisserie.id, name: "Tarte au citron", price: 6000, station: "patisserie" },
      { establishmentId: establishment.id, categoryId: catPatisserie.id, name: "Éclair au chocolat", price: 5500, station: "patisserie" },
    ],
  });

  const zoneTerrasse = await prisma.zone.create({
    data: { establishmentId: establishment.id, name: "Terrasse" },
  });
  const zonePiscine = await prisma.zone.create({
    data: { establishmentId: establishment.id, name: "Piscine" },
  });

  await prisma.table.createMany({
    data: [
      { establishmentId: establishment.id, zoneId: zoneTerrasse.id, label: "T1", seats: 4 },
      { establishmentId: establishment.id, zoneId: zoneTerrasse.id, label: "T2", seats: 2 },
      { establishmentId: establishment.id, zoneId: zoneTerrasse.id, label: "T3", seats: 6 },
      { establishmentId: establishment.id, zoneId: zonePiscine.id, label: "P1", seats: 2 },
      { establishmentId: establishment.id, zoneId: zonePiscine.id, label: "P2", seats: 4 },
    ],
  });

  console.log("Seed terminé. Connexion : admin@eventflow.mg / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
