import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PACKAGES, ADDONS } from "../src/lib/rasa-data";
import { parseSelection, slugify } from "../src/lib/selection";

const db = new PrismaClient();

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
      phone: "7545800800",
      city: "Jamshedpur",
    },
  });
  console.log("Admin: admin@rasakitchen.co / admin123");

  const dishIdByName = new Map<string, string>();
  for (const p of PACKAGES) {
    for (const s of p.sections) {
      for (const d of s.dishes) {
        if (dishIdByName.has(d)) continue;
        let dish = await db.dish.findUnique({ where: { name: d } });
        if (!dish) {
          dish = await db.dish.create({
            data: {
              name: d,
              slug: slugify(d) || `dish-${Math.random().toString(36).slice(2, 8)}`,
              isActive: true,
            },
          });
        }
        dishIdByName.set(d, dish.id);
      }
    }
  }

  for (let i = 0; i < PACKAGES.length; i++) {
    const p = PACKAGES[i];
    const pkg = await db.package.upsert({
      where: { slug: p.id },
      create: {
        slug: p.id,
        name: p.name,
        tagline: p.tagline,
        price: p.price * 100,
        minGuests: p.minGuests || 100,
        featured: !!p.featured,
        displayOrder: i,
        isActive: true,
        sections: JSON.stringify(p.sections),
      },
      update: {
        name: p.name,
        tagline: p.tagline,
        price: p.price * 100,
        sections: JSON.stringify(p.sections),
        displayOrder: i,
      },
    });

    await db.sectionDish.deleteMany({ where: { section: { packageId: pkg.id } } });
    await db.menuSection.deleteMany({ where: { packageId: pkg.id } });

    for (let si = 0; si < p.sections.length; si++) {
      const s = p.sections[si];
      const max = parseSelection(s.selection);
      const section = await db.menuSection.create({
        data: {
          packageId: pkg.id,
          name: s.section,
          selectionRule: s.selection,
          selectionCount: max,
          displayOrder: si,
          isAll: max === 999,
          isComplimentary: max === 0,
        },
      });
      for (let di = 0; di < s.dishes.length; di++) {
        const dishId = dishIdByName.get(s.dishes[di]);
        if (dishId) {
          await db.sectionDish.create({
            data: { sectionId: section.id, dishId, displayOrder: di },
          });
        }
      }
    }
  }

  for (let i = 0; i < ADDONS.length; i++) {
    const a = ADDONS[i];
    await db.addon.upsert({
      where: { slug: a.id },
      create: {
        slug: a.id,
        name: a.name,
        description: a.description || null,
        price: a.price * 100,
        priceType: a.priceType,
        category: a.category,
        isNv: !!a.nv,
        isActive: true,
        choices: a.choices ? JSON.stringify(a.choices) : null,
        displayOrder: i,
      },
      update: {
        name: a.name,
        price: a.price * 100,
        description: a.description || null,
        displayOrder: i,
      },
    });
  }

  console.log(`Seeded ${PACKAGES.length} packages, ${ADDONS.length} addons`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
