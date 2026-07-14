import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { authErrorResponse } from "@/lib/api-auth";
import { rebuildPackageSectionsCache, ensureDish, parseSelection } from "@/lib/admin-catalog";

export async function POST(req: Request) {
  try {
    await requirePermission("catalog.write");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }

  const body = await req.json();
  const packageId = String(body.packageId || "");
  const name = String(body.name || "").trim();
  const selectionRule = String(body.selectionRule || "Any One").trim();
  if (!packageId || !name) {
    return NextResponse.json({ error: "packageId and name required" }, { status: 422 });
  }

  const count = parseSelection(selectionRule);
  const maxOrder = await db.menuSection.aggregate({
    where: { packageId },
    _max: { displayOrder: true },
  });

  const section = await db.menuSection.create({
    data: {
      packageId,
      name,
      selectionRule,
      selectionCount: count,
      displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
      isAll: count === 999,
      isComplimentary: count === 0,
    },
  });

  const dishes: string[] = Array.isArray(body.dishes) ? body.dishes.map(String) : [];
  for (let i = 0; i < dishes.length; i++) {
    const dish = await ensureDish(dishes[i]);
    await db.sectionDish.create({
      data: { sectionId: section.id, dishId: dish.id, displayOrder: i },
    });
  }

  await rebuildPackageSectionsCache(packageId);
  return NextResponse.json({ ok: true, section: { id: section.id } });
}

export async function PATCH(req: Request) {
  try {
    await requirePermission("catalog.write");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }

  const body = await req.json();
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 422 });

  const existing = await db.menuSection.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.name != null) data.name = String(body.name).trim();
  if (body.selectionRule != null) {
    const rule = String(body.selectionRule).trim();
    const count = parseSelection(rule);
    data.selectionRule = rule;
    data.selectionCount = count;
    data.isAll = count === 999;
    data.isComplimentary = count === 0;
  }
  if (body.displayOrder != null) data.displayOrder = Number(body.displayOrder);

  await db.menuSection.update({ where: { id }, data });

  // Replace dishes list if provided
  if (Array.isArray(body.dishes)) {
    await db.sectionDish.deleteMany({ where: { sectionId: id } });
    const dishes: string[] = body.dishes.map(String).filter((d) => d.trim());
    for (let i = 0; i < dishes.length; i++) {
      const dish = await ensureDish(dishes[i]);
      await db.sectionDish.create({
        data: { sectionId: id, dishId: dish.id, displayOrder: i },
      });
    }
  }

  await rebuildPackageSectionsCache(existing.packageId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  try {
    await requirePermission("catalog.write");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 422 });

  const existing = await db.menuSection.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.sectionDish.deleteMany({ where: { sectionId: id } });
  await db.menuSection.delete({ where: { id } });
  await rebuildPackageSectionsCache(existing.packageId);
  return NextResponse.json({ ok: true });
}
