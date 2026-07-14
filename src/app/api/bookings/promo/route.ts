import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/permissions";
import {
  computePromoDiscount,
  findValidPromo,
  promoDiscountNote,
  repriceBookingMoney,
} from "@/lib/promo";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const bookingId = String(body.bookingId || "");
  if (!bookingId) return NextResponse.json({ error: "Missing bookingId" }, { status: 422 });

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { payments: { where: { status: "success" }, take: 1 } },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.userId !== user.id && !isStaffRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hasPaid = booking.payments.length > 0 || booking.advancePaid > 0;
  // Customers cannot change promo after payment; staff (admin/manager) can still adjust offers.
  if (hasPaid && !isStaffRole(user.role)) {
    return NextResponse.json(
      { error: "Promo cannot be changed after a payment has been made on this order" },
      { status: 409 }
    );
  }

  // Clear promo
  if (body.clear) {
    const prevId = booking.promoCodeId;
    const money = await repriceBookingMoney(booking, 0);
    const updated = await db.$transaction(async (tx) => {
      if (prevId) {
        await tx.promoCode.updateMany({
          where: { id: prevId, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }
      return tx.booking.update({
        where: { id: bookingId },
        data: {
          promoCodeId: null,
          discount: 0,
          discountNote: null,
          subtotal: money.subtotal,
          gst: money.gst,
          total: money.total,
          balance: money.balance,
        },
        include: { promoCode: true, payments: true },
      });
    });
    return NextResponse.json({ booking: updated });
  }

  const promo = await findValidPromo(String(body.code || ""));
  if (!promo) {
    return NextResponse.json({ error: "Invalid or expired promo code" }, { status: 404 });
  }

  const moneyPreview = await repriceBookingMoney(booking, 0);
  if (moneyPreview.preDiscount < (promo.minOrderPaise || 0)) {
    return NextResponse.json(
      {
        error: `Minimum order ₹${Math.round((promo.minOrderPaise || 0) / 100).toLocaleString("en-IN")} required`,
      },
      { status: 422 }
    );
  }

  const discountPaise = computePromoDiscount(moneyPreview.preDiscount, promo);
  const money = await repriceBookingMoney(booking, discountPaise);
  const note = promoDiscountNote(promo);
  const prevId = booking.promoCodeId;

  const updated = await db.$transaction(async (tx) => {
    if (prevId && prevId !== promo.id) {
      await tx.promoCode.updateMany({
        where: { id: prevId, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }
    if (prevId !== promo.id) {
      await tx.promoCode.update({
        where: { id: promo.id },
        data: { usedCount: { increment: 1 } },
      });
    }
    return tx.booking.update({
      where: { id: bookingId },
      data: {
        promoCodeId: promo.id,
        discount: money.discount,
        discountNote: note,
        subtotal: money.subtotal,
        gst: money.gst,
        total: money.total,
        balance: money.balance,
      },
      include: { promoCode: true, payments: true },
    });
  });

  return NextResponse.json({ booking: updated });
}
