import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Package, Addon, Section } from "@/lib/rasa-data";

/** Public catalog — packages with sections/dishes + addons, shaped for the frontend */
export async function GET() {
  try {
    const [packages, addons] = await Promise.all([
      db.package.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
        include: {
          menuSections: {
            orderBy: { displayOrder: "asc" },
            include: {
              dishes: {
                orderBy: { displayOrder: "asc" },
                include: { dish: true },
              },
            },
          },
        },
      }),
      db.addon.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      }),
    ]);

    const shapedPackages: Package[] = packages.map((p) => {
      let sections: Section[];
      if (p.menuSections.length > 0) {
        sections = p.menuSections.map((s) => ({
          section: s.name,
          selection: s.selectionRule,
          dishes: s.dishes.map((sd) => sd.dish.name),
        }));
      } else {
        try {
          sections = JSON.parse(p.sections) as Section[];
        } catch {
          sections = [];
        }
      }
      return {
        id: p.slug,
        name: p.name,
        tagline: p.tagline,
        price: Math.round(p.price / 100),
        minGuests: p.minGuests,
        featured: p.featured,
        sections,
      };
    });

    const shapedAddons: Addon[] = addons.map((a) => {
      let choices: string[] | undefined;
      if (a.choices) {
        try {
          choices = JSON.parse(a.choices) as string[];
        } catch {
          choices = undefined;
        }
      }
      return {
        id: a.slug,
        name: a.name,
        description: a.description || "",
        price: Math.round(a.price / 100),
        priceType: a.priceType as Addon["priceType"],
        category: a.category,
        nv: a.isNv || undefined,
        choices,
      };
    });

    return NextResponse.json({
      ok: true,
      packages: shapedPackages,
      addons: shapedAddons,
      meta: {
        packageCount: shapedPackages.length,
        addonCount: shapedAddons.length,
        sectionCount: packages.reduce((n, p) => n + p.menuSections.length, 0),
        dishLinks: packages.reduce(
          (n, p) => n + p.menuSections.reduce((m, s) => m + s.dishes.length, 0),
          0
        ),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[catalog]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
