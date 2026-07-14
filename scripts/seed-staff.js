/**
 * Upsert manager + sales staff accounts (and ensure admin exists).
 * Usage: node scripts/seed-staff.js
 * Requires DATABASE_URL (loads .env via Prisma).
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const db = new PrismaClient();

const STAFF = [
  { email: "admin@rasakitchen.co", name: "Devendra Purohit", phone: "7545800800", role: "admin", password: "admin123" },
  { email: "manager@rasakitchen.co", name: "Kitchen Manager", phone: "7545800801", role: "manager", password: "manager123" },
  { email: "sales@rasakitchen.co", name: "Sales Executive", phone: "7545800802", role: "sales", password: "sales123" },
];

async function main() {
  for (const s of STAFF) {
    const hash = await bcrypt.hash(s.password, 10);
    const existing = await db.user.findUnique({ where: { email: s.email } });
    if (!existing) {
      await db.user.create({
        data: {
          email: s.email,
          name: s.name,
          phone: s.phone,
          city: "Jamshedpur",
          passwordHash: hash,
          role: s.role,
          isActive: true,
        },
      });
      console.log("created", s.email, s.role);
    } else {
      await db.user.update({
        where: { email: s.email },
        data: {
          role: s.role,
          isActive: true,
          passwordHash: hash,
          name: existing.name || s.name,
        },
      });
      console.log("updated", s.email, s.role);
    }
  }
  console.log("Done. Logins:");
  for (const s of STAFF) console.log(`  ${s.role}: ${s.email} / ${s.password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
