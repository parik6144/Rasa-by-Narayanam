import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { rebuildPackageSectionsCache, ensureDish, parseSelection } from "@/lib/admin-catalog";
import { slugify } from "@/lib/selection";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const packages = await db.package.findMany({
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
      _count: { select: { bookings: true } },
    },
  });

  return NextResponse.json({
    packages: packages.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      price: Math.round(p.price / 100),
      minGuests: p.minGuests,
      featured: p.featured,
      isActive: p.isActive,
      displayOrder: p.displayOrder,
      bookingCount: p._count.bookings,
      sections: p.menuSections.map((s) => ({
        id: s.id,
        name: s.name,
        selectionRule: s.selectionRule,
        selectionCount: s.selectionCount,
        displayOrder: s.displayOrder,
        isAll: s.isAll,
        isComplimentary: s.isComplimentary,
        dishes: s.dishes.map((sd) => ({
          linkId: sd.id,
          id: sd.dish.id,
          name: sd.dish.name,
          displayOrder: sd.displayOrder,
        })),
      })),
    })),
  });
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  const tagline = String(body.tagline || "").trim();
  const price = Number(body.price);
  if (!name || !tagline || !Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Name, tagline and price are required" }, { status: 422 });
  }

  const baseSlug = slugify(String(body.slug || name)) || `package-${Date.now().toString(36)}`;
  let slug = baseSlug;
  let n = 2;
  while (await db.package.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${n++}`;
  }

  const maxOrder = await db.package.aggregate({ _max: { displayOrder: true } });
  const pkg = await db.package.create({
    data: {
      slug,
      name,
      tagline,
      price: Math.round(price * 100),
      minGuests: Number(body.minGuests) || 100,
      featured: !!body.featured,
      isActive: body.isActive !== false,
      displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
      sections: "[]",
    },
  });

  // Optional starter sections from body.sections: [{name, selectionRule, dishes: string[]}]
  if (Array.isArray(body.sections)) {
    for (let i = 0; i < body.sections.length; i++) {
      const s = body.sections[i];
      const rule = String(s.selectionRule || s.selection || "Any One");
      const count = parseSelection(rule);
      const section = await db.menuSection.create({
        data: {
          packageId: pkg.id,
          name: String(s.name || s.section || `Section ${i + 1}`),
          selectionRule: rule,
          selectionCount: count,
          displayOrder: i,
          isAll: count === 999,
          isComplimentary: count === 0,
        },
      });
      const dishes: string[] = Array.isArray(s.dishes) ? s.dishes : [];
      for (let di = 0; di < dishes.length; di++) {
        const dish = await ensureDish(String(dishes[di]));
        await db.sectionDish.create({
          data: { sectionId: section.id, dishId: dish.id, displayOrder: di },
        });
      }
    }
    await rebuildPackageSectionsCache(pkg.id);
  }

  return NextResponse.json({ ok: true, package: { id: pkg.id, slug: pkg.slug } });
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 422 });

  const data: Record<string, unknown> = {};
  if (body.name != null) data.name = String(body.name).trim();
  if (body.tagline != null) data.tagline = String(body.tagline).trim();
  if (body.price != null) data.price = Math.round(Number(body.price) * 100);
  if (body.minGuests != null) data.minGuests = Number(body.minGuests) || 100;
  if (body.featured != null) data.featured = !!body.featured;
  if (body.isActive != null) data.isActive = !!body.isActive;
  if (body.displayOrder != null) data.displayOrder = Number(body.displayOrder);

  if (body.slug != null) {
    const slug = slugify(String(body.slug));
    if (slug) {
      const clash = await db.package.findFirst({ where: { slug, NOT: { id } } });
      if (clash) return NextResponse.json({ error: "Slug already used" }, { status: 409 });
      data.slug = slug;
    }
  }

  const updated = await db.package.update({ where: { id }, data });
  return NextResponse.json({ ok: true, package: updated });
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 422 });

  const bookings = await db.booking.count({ where: { packageId: id } });
  if (bookings > 0) {
    // Soft delete — keep history
    await db.package.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ ok: true, softDeleted: true, message: "Package deactivated (has bookings)" });
  }

  await db.sectionDish.deleteMany({ where: { section: { packageId: id } } });
  await db.menuSection.deleteMany({ where: { packageId: id } });
  await db.package.delete({ where: { id } });
  return NextResponse.json({ ok: true, deleted: true });
}
