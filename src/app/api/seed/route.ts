// Seed catalog into normalized tables (packages → sections → dishes) + addons + admin
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { PACKAGES, ADDONS } from "@/lib/rasa-data";
import { parseSelection, slugify } from "@/lib/selection";

const FEATURED_SLUG = "rasa-utsav-799";

export async function POST() {
  try {
    // 1. Staff accounts (admin / manager / sales)
    const staffSeed = [
      { email: "admin@rasakitchen.co", name: "Devendra Purohit", phone: "7545800800", role: "admin", password: "admin123" },
      { email: "manager@rasakitchen.co", name: "Kitchen Manager", phone: "7545800801", role: "manager", password: "manager123" },
      { email: "sales@rasakitchen.co", name: "Sales Executive", phone: "7545800802", role: "sales", password: "sales123" },
    ] as const;

    for (const s of staffSeed) {
      const existing = await db.user.findUnique({ where: { email: s.email } });
      if (!existing) {
        const hash = await hashPassword(s.password);
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
      } else if (existing.role !== s.role || existing.isActive === false) {
        await db.user.update({
          where: { email: s.email },
          data: { role: s.role, isActive: true, name: existing.name || s.name },
        });
      }
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
          guestRange: a.guestRange || 0,
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
          // guestRange left unchanged so admin edits are preserved on re-seed
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
      message:
        "Catalog seeded. Staff: admin@rasakitchen.co / admin123 · manager@rasakitchen.co / manager123 · sales@rasakitchen.co / sales123",
      staff: [
        { role: "admin", email: "admin@rasakitchen.co", password: "admin123" },
        { role: "manager", email: "manager@rasakitchen.co", password: "manager123" },
        { role: "sales", email: "sales@rasakitchen.co", password: "sales123" },
      ],
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
