const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { PACKAGES, ADDONS } = require("./seed-data-bridge.js");

const db = new PrismaClient();

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

async function main() {
  const hash = await bcrypt.hash("admin123", 10);
  await db.user.upsert({
    where: { email: "admin@rasakitchen.co" },
    update: { passwordHash: hash, role: "admin", name: "Admin" },
    create: {
      email: "admin@rasakitchen.co",
      name: "Admin",
      passwordHash: hash,
      role: "admin",
    },
  });
  console.log("Admin ready: admin@rasakitchen.co / admin123");

  // Minimal: if no packages, tell user to hit Next seed once
  const count = await db.package.count();
  console.log("Packages in DB:", count);
  if (count === 0) {
    console.log("Run: start Next briefly and POST /api/seed, OR npm run seed:catalog");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
