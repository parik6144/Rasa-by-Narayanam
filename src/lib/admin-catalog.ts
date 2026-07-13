import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseSelection, slugify } from "@/lib/selection";

async function rebuildPackageSectionsCache(packageId: string) {
  const sections = await db.menuSection.findMany({
    where: { packageId },
    orderBy: { displayOrder: "asc" },
    include: {
      dishes: {
        orderBy: { displayOrder: "asc" },
        include: { dish: true },
      },
    },
  });
  const json = JSON.stringify(
    sections.map((s) => ({
      section: s.name,
      selection: s.selectionRule,
      dishes: s.dishes.map((d) => d.dish.name),
    }))
  );
  await db.package.update({ where: { id: packageId }, data: { sections: json } });
}

export async function ensureDish(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Empty dish name");
  const existing = await db.dish.findUnique({ where: { name: trimmed } });
  if (existing) return existing;
  const base = slugify(trimmed) || `dish-${Date.now().toString(36)}`;
  let slug = base;
  let n = 2;
  while (await db.dish.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  try {
    return await db.dish.create({ data: { name: trimmed, slug, isActive: true } });
  } catch {
    const again = await db.dish.findUnique({ where: { name: trimmed } });
    if (again) return again;
    throw new Error(`Could not create dish: ${trimmed}`);
  }
}

export { rebuildPackageSectionsCache, parseSelection };
