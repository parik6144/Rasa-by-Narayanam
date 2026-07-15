const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const updates = [
  {
    slug: "fresh-juices-per-variety",
    choices: [
      "Sweet Lime",
      "Orange",
      "Pineapple",
      "Red Grapes",
      "Green Grapes",
      "Watermelon",
      "Pomegranate",
    ],
  },
  {
    slug: "premium-shakes-per-variety",
    choices: ["Vanilla", "Chocolate", "Strawberry", "Mango", "Oreo", "Rose Thandai"],
  },
  {
    slug: "super-premium-shakes-per-variety",
    choices: ["Saffron Pistachio", "Belgian Chocolate", "Matcha", "Baklava", "Kesar Badam"],
  },
];

(async () => {
  for (const u of updates) {
    await p.addon.update({
      where: { slug: u.slug },
      data: { choices: JSON.stringify(u.choices) },
    });
    console.log("updated", u.slug, u.choices.length);
  }
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
