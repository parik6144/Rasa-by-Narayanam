import { NextRequest, NextResponse } from "next/server";
import {
  computePromoDiscount,
  findValidPromo,
  totalsAfterDiscount,
} from "@/lib/promo";

/** Preview a promo against a pre-GST or gross total. Auth not required — apply locks on booking create/pay. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const code = String(body.code || "");
  // Prefer explicit subtotal; else derive from totalWithGst (rupees)
  let subtotalPaise = 0;
  if (body.subtotalRupees != null) {
    subtotalPaise = Math.round(Number(body.subtotalRupees) * 100);
  } else if (body.totalRupees != null) {
    const gross = Math.round(Number(body.totalRupees) * 100);
    subtotalPaise = Math.round(gross / 1.05);
  }

  const promo = await findValidPromo(code);
  if (!promo) {
    return NextResponse.json({ error: "Invalid or expired promo code" }, { status: 404 });
  }
  if (subtotalPaise < (promo.minOrderPaise || 0)) {
    return NextResponse.json(
      {
        error: `Minimum order ₹${Math.round((promo.minOrderPaise || 0) / 100).toLocaleString("en-IN")} required`,
      },
      { status: 422 }
    );
  }

  const discountPaise = computePromoDiscount(subtotalPaise, promo);
  const priced = totalsAfterDiscount(subtotalPaise, discountPaise);

  return NextResponse.json({
    promo: {
      id: promo.id,
      code: promo.code,
      label: promo.label,
      type: promo.type,
      value: promo.type === "percent" ? promo.value : Math.round(promo.value / 100),
    },
    discountRupees: Math.round(discountPaise / 100),
    subtotalRupees: Math.round(priced.subtotal / 100),
    gstRupees: Math.round(priced.gst / 100),
    totalRupees: Math.round(priced.total / 100),
  });
}
