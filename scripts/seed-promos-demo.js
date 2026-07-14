/**
 * Seed demo promo codes RASA10 (10%) and FLAT5K (₹5000).
 * Usage: node scripts/seed-promos-demo.js
 */
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function upsertPromo(data) {
  const existing = await db.promoCode.findUnique({ where: { code: data.code } });
  if (existing) {
    await db.promoCode.update({
      where: { code: data.code },
      data: { ...data, isActive: true },
    });
    console.log("updated", data.code);
  } else {
    await db.promoCode.create({ data });
    console.log("created", data.code);
  }
}

async function main() {
  await upsertPromo({
    code: "RASA10",
    label: "Festival 10% off",
    type: "percent",
    value: 10,
    minOrderPaise: 5000000, // ₹50,000
    maxDiscountPaise: 5000000, // cap ₹50,000
    usageLimit: null,
    usedCount: 0,
    isActive: true,
    createdBy: "seed",
  });
  await upsertPromo({
    code: "FLAT5K",
    label: "Flat ₹5,000 off",
    type: "fixed",
    value: 500000, // paise
    minOrderPaise: 10000000, // ₹1,00,000
    maxDiscountPaise: null,
    usageLimit: 100,
    usedCount: 0,
    isActive: true,
    createdBy: "seed",
  });
  console.log("Done. Try RASA10 or FLAT5K at booking final step.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
