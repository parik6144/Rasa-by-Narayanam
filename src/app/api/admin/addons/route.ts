import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { authErrorResponse } from "@/lib/api-auth";
import { slugify } from "@/lib/selection";

export async function GET() {
  try {
    await requirePermission("catalog.read");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }

  const addons = await db.addon.findMany({ orderBy: [{ category: "asc" }, { displayOrder: "asc" }] });
  return NextResponse.json({
    addons: addons.map((a) => ({
      id: a.id,
      slug: a.slug,
      name: a.name,
      description: a.description || "",
      price: Math.round(a.price / 100),
      priceType: a.priceType,
      category: a.category,
      isNv: a.isNv,
      isActive: a.isActive,
      displayOrder: a.displayOrder,
      guestRange: a.guestRange || 0,
      choices: a.choices ? (JSON.parse(a.choices) as string[]) : [],
    })),
  });
}

export async function POST(req: Request) {
  try {
    await requirePermission("catalog.write");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim();
  const price = Number(body.price);
  if (!name || !category || !Number.isFinite(price)) {
    return NextResponse.json({ error: "Name, category and price required" }, { status: 422 });
  }

  const baseSlug = slugify(String(body.slug || name)) || `addon-${Date.now().toString(36)}`;
  let slug = baseSlug;
  let n = 2;
  while (await db.addon.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${n++}`;
  }

  const maxOrder = await db.addon.aggregate({
    where: { category },
    _max: { displayOrder: true },
  });

  const addon = await db.addon.create({
    data: {
      slug,
      name,
      description: String(body.description || ""),
      price: Math.round(price * 100),
      priceType: String(body.priceType || "per_guest"),
      category,
      isNv: !!body.isNv,
      isActive: body.isActive !== false,
      guestRange: Math.max(0, Math.round(Number(body.guestRange) || 0)),
      displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
      choices: Array.isArray(body.choices) && body.choices.length
        ? JSON.stringify(body.choices.map(String))
        : null,
    },
  });

  return NextResponse.json({ ok: true, addon: { id: addon.id, slug: addon.slug } });
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

  const data: Record<string, unknown> = {};
  if (body.name != null) data.name = String(body.name).trim();
  if (body.description != null) data.description = String(body.description);
  if (body.price != null) data.price = Math.round(Number(body.price) * 100);
  if (body.priceType != null) data.priceType = String(body.priceType);
  if (body.category != null) data.category = String(body.category).trim();
  if (body.isNv != null) data.isNv = !!body.isNv;
  if (body.isActive != null) data.isActive = !!body.isActive;
  if (body.displayOrder != null) data.displayOrder = Number(body.displayOrder);
  if (body.guestRange != null) data.guestRange = Math.max(0, Math.round(Number(body.guestRange) || 0));
  if (Array.isArray(body.choices)) {
    data.choices = body.choices.length ? JSON.stringify(body.choices.map(String)) : null;
  }

  await db.addon.update({ where: { id }, data });
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

  await db.addon.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
