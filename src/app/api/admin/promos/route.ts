import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { authErrorResponse } from "@/lib/api-auth";
import { normalizeCode } from "@/lib/promo";

export async function GET() {
  try {
    await requirePermission("offers.manage");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }
  const promos = await db.promoCode.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ promos });
}

export async function POST(req: NextRequest) {
  let staff;
  try {
    staff = await requirePermission("offers.manage");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }

  const body = await req.json();
  const code = normalizeCode(String(body.code || ""));
  const label = String(body.label || "").trim();
  const type = String(body.type || "") as "percent" | "fixed";
  if (!code || !label || !["percent", "fixed"].includes(type)) {
    return NextResponse.json({ error: "code, label, and type (percent|fixed) required" }, { status: 422 });
  }

  let value = Number(body.value);
  if (!Number.isFinite(value) || value <= 0) {
    return NextResponse.json({ error: "value must be a positive number" }, { status: 422 });
  }
  if (type === "percent") {
    value = Math.min(100, Math.round(value));
  } else {
    // UI sends rupees for fixed → store paise
    value = Math.round(value * 100);
  }

  const existing = await db.promoCode.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: "This promo code already exists" }, { status: 409 });
  }

  const promo = await db.promoCode.create({
    data: {
      code,
      label,
      type,
      value,
      minOrderPaise: Math.round(Number(body.minOrderRupees || 0) * 100) || 0,
      maxDiscountPaise:
        body.maxDiscountRupees != null && body.maxDiscountRupees !== ""
          ? Math.round(Number(body.maxDiscountRupees) * 100)
          : null,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      usageLimit:
        body.usageLimit != null && body.usageLimit !== ""
          ? Math.max(1, parseInt(String(body.usageLimit), 10))
          : null,
      isActive: body.isActive !== false,
      createdBy: staff.id,
    },
  });
  return NextResponse.json({ promo }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  try {
    await requirePermission("offers.manage");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }

  const body = await req.json();
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 422 });

  const existing = await db.promoCode.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.label !== undefined) data.label = String(body.label).trim();
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (body.minOrderRupees !== undefined) {
    data.minOrderPaise = Math.round(Number(body.minOrderRupees || 0) * 100) || 0;
  }
  if (body.maxDiscountRupees !== undefined) {
    data.maxDiscountPaise =
      body.maxDiscountRupees === null || body.maxDiscountRupees === ""
        ? null
        : Math.round(Number(body.maxDiscountRupees) * 100);
  }
  if (body.startsAt !== undefined) data.startsAt = body.startsAt ? new Date(body.startsAt) : null;
  if (body.endsAt !== undefined) data.endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if (body.usageLimit !== undefined) {
    data.usageLimit =
      body.usageLimit === null || body.usageLimit === ""
        ? null
        : Math.max(1, parseInt(String(body.usageLimit), 10));
  }
  if (body.type !== undefined && ["percent", "fixed"].includes(body.type)) {
    data.type = body.type;
  }
  if (body.value !== undefined) {
    const type = (data.type as string) || existing.type;
    let value = Number(body.value);
    if (type === "percent") value = Math.min(100, Math.round(value));
    else value = Math.round(value * 100);
    data.value = value;
  }

  const promo = await db.promoCode.update({ where: { id }, data });
  return NextResponse.json({ promo });
}

export async function DELETE(req: NextRequest) {
  try {
    await requirePermission("offers.manage");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 422 });
  // Soft-deactivate instead of hard delete (keeps booking history)
  const promo = await db.promoCode.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ promo });
}
