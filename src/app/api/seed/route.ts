// Seed catalog into normalized tables (packages → sections → dishes) + addons + admin
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { PACKAGES, ADDONS } from "@/lib/rasa-data";
import { parseSelection, slugify } from "@/lib/selection";

const FEATURED_SLUG = "rasa-utsav-799";

export async function POST() {
  try {
    // 1. Admin
    const adminEmail = "admin@rasakitchen.co";
    const existing = await db.user.findUnique({ where: { email: adminEmail } });
    if (!existing) {
      const hash = await hashPassword("admin123");
      await db.user.create({
        data: {
          email: adminEmail,
          name: "Devendra Purohit",
          phone: "7545800800",
          city: "Jamshedpur",
          passwordHash: hash,
          role: "admin",
        },
      });
    }

    // 2. Global dish map (dedupe by name)
    const dishIdByName = new Map<string, string>();
    const allDishNames = new Set<string>();
    for (const p of PACKAGES) {
      for (const s of p.sections) {
        for (const d of s.dishes) allDishNames.add(d);
      }
    }

    for (const name of allDishNames) {
      const baseSlug = slugify(name) || `dish-${Math.random().toString(36).slice(2, 8)}`;
      let dish = await db.dish.findUnique({ where: { name } });
      if (!dish) {
        let attempt = baseSlug;
        let n = 2;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const clash = await db.dish.findUnique({ where: { slug: attempt } });
          if (!clash) break;
          attempt = `${baseSlug}-${n++}`;
        }
        try {
          dish = await db.dish.create({ data: { name, slug: attempt, isActive: true } });
        } catch {
          dish = await db.dish.findUnique({ where: { name } });
          if (!dish) throw new Error(`Failed to create dish: ${name}`);
        }
      }
      dishIdByName.set(name, dish.id);
    }

    // 3. Packages + sections + section dishes
    let packagesUpserted = 0;
    for (let i = 0; i < PACKAGES.length; i++) {
      const p = PACKAGES[i];
      const sectionsJson = JSON.stringify(p.sections);
      const minGuests = p.minGuests || 100;
      const featured = p.featured === true || p.id === FEATURED_SLUG;

      const pkg = await db.package.upsert({
        where: { slug: p.id },
        create: {
          slug: p.id,
          name: p.name,
          tagline: p.tagline,
          price: p.price * 100,
          minGuests,
          featured,
          displayOrder: i,
          isActive: true,
          sections: sectionsJson,
        },
        update: {
          name: p.name,
          tagline: p.tagline,
          price: p.price * 100,
          minGuests,
          featured,
          displayOrder: i,
          isActive: true,
          sections: sectionsJson,
        },
      });

      // Replace sections for this package (clean rebuild)
      await db.sectionDish.deleteMany({
        where: { section: { packageId: pkg.id } },
      });
      await db.menuSection.deleteMany({ where: { packageId: pkg.id } });

      for (let si = 0; si < p.sections.length; si++) {
        const s = p.sections[si];
        const count = parseSelection(s.selection);
        const section = await db.menuSection.create({
          data: {
            packageId: pkg.id,
            name: s.section,
            selectionRule: s.selection,
            selectionCount: count,
            displayOrder: si,
            isAll: count === 999,
            isComplimentary: count === 0,
          },
        });

        for (let di = 0; di < s.dishes.length; di++) {
          const dishName = s.dishes[di];
          const dishId = dishIdByName.get(dishName);
          if (!dishId) continue;
          await db.sectionDish.create({
            data: {
              sectionId: section.id,
              dishId,
              displayOrder: di,
            },
          });
        }
      }
      packagesUpserted++;
    }

    // 4. Addons
    let addonsUpserted = 0;
    for (let i = 0; i < ADDONS.length; i++) {
      const a = ADDONS[i];
      await db.addon.upsert({
        where: { slug: a.id },
        create: {
          slug: a.id,
          name: a.name,
          description: a.description,
          price: a.price * 100,
          priceType: a.priceType,
          category: a.category,
          isNv: !!a.nv,
          isActive: true,
          displayOrder: i,
          choices: a.choices?.length ? JSON.stringify(a.choices) : null,
        },
        update: {
          name: a.name,
          description: a.description,
          price: a.price * 100,
          priceType: a.priceType,
          category: a.category,
          isNv: !!a.nv,
          isActive: true,
          displayOrder: i,
          choices: a.choices?.length ? JSON.stringify(a.choices) : null,
        },
      });
      addonsUpserted++;
    }

    const [pkgCount, sectionCount, dishCount, addonCount] = await Promise.all([
      db.package.count(),
      db.menuSection.count(),
      db.dish.count(),
      db.addon.count(),
    ]);

    return NextResponse.json({
      ok: true,
      message: "Catalog seeded into dynamic tables. Admin: admin@rasakitchen.co / admin123",
      stats: {
        packagesUpserted,
        addonsUpserted,
        packages: pkgCount,
        sections: sectionCount,
        dishes: dishCount,
        addons: addonCount,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[seed]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
