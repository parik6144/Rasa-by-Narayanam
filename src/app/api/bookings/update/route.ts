// Booking update — within edit window before event
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, isStaffRole } from "@/lib/permissions";
import { CONFIG } from "@/lib/rasa-data";
import {
  computePromoDiscount,
  findValidPromo,
  promoDiscountNote,
  repriceBookingMoney,
  subtotalFromGrossTotal,
  totalsAfterDiscount,
  type PromoLike,
} from "@/lib/promo";

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      bookingId, guests, venue, city, notes, menuSnapshot, addonsSnapshot,
      customDishes, discount, discountNote, occasion, eventDate, total,
      promoCode,
    } = body as {
      bookingId?: string; guests?: number; venue?: string; city?: string; notes?: string;
      menuSnapshot?: unknown; addonsSnapshot?: unknown; customDishes?: unknown;
      discount?: number; discountNote?: string; occasion?: string; eventDate?: string;
      total?: number; promoCode?: string | null;
    };

    if (!bookingId) return NextResponse.json({ error: "Missing bookingId" }, { status: 422 });

    const booking = await db.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const isOwner = booking.userId === user.id;
    const isStaff = isStaffRole(user.role);
    const canDiscount = hasPermission(user.role, "bookings.discount");
    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isStaff) {
      const daysToEvent = Math.floor((booking.eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysToEvent < CONFIG.editWindowDays) {
        return NextResponse.json({
          error: `Edit window closed. You can change the menu until ${CONFIG.editWindowDays} days before the event. Call ${CONFIG.phoneDisplay}.`,
        }, { status: 403 });
      }
      if (booking.status === "menu_locked" || booking.status === "cancelled" || booking.status === "completed") {
        return NextResponse.json({ error: "This booking can no longer be edited online." }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (guests !== undefined) updateData.guests = guests;
    if (venue !== undefined) updateData.venue = venue;
    if (city !== undefined) updateData.city = city;
    if (notes !== undefined) updateData.notes = notes;
    if (menuSnapshot !== undefined) updateData.menuSnapshot = JSON.stringify(menuSnapshot);
    if (addonsSnapshot !== undefined) updateData.addonsSnapshot = JSON.stringify(addonsSnapshot);
    if (customDishes !== undefined) updateData.customDishes = JSON.stringify(customDishes);
    if (occasion !== undefined) updateData.occasion = occasion;
    if (eventDate !== undefined) updateData.eventDate = new Date(eventDate);

    let appliedPromo: PromoLike | null | undefined;
    let clearPromo = false;
    if (promoCode !== undefined) {
      const code = String(promoCode || "").trim();
      if (!code) {
        clearPromo = true;
        appliedPromo = null;
      } else {
        const promo = await findValidPromo(code);
        if (!promo) {
          return NextResponse.json({ error: "Invalid or expired promo code" }, { status: 422 });
        }
        appliedPromo = promo;
      }
    }

    const shouldReprice =
      guests !== undefined ||
      addonsSnapshot !== undefined ||
      menuSnapshot !== undefined ||
      typeof total === "number" ||
      promoCode !== undefined ||
      (canDiscount && discount !== undefined);

    let nextPromoId = booking.promoCodeId;
    let discountPaise = booking.discount || 0;
    let nextNote = booking.discountNote;

    if (clearPromo) {
      nextPromoId = null;
      discountPaise = 0;
      nextNote = null;
    } else if (appliedPromo) {
      nextPromoId = appliedPromo.id;
      nextNote = promoDiscountNote(appliedPromo);
    } else if (canDiscount && discount !== undefined) {
      discountPaise = Math.round(Number(discount) * 100);
      if (discountNote !== undefined) nextNote = discountNote;
    }

    if (shouldReprice) {
      const draft = {
        ...booking,
        guests: guests ?? booking.guests,
        addonsSnapshot:
          (updateData.addonsSnapshot as string | undefined) ?? booking.addonsSnapshot,
      };
      const moneyPreview = await repriceBookingMoney(draft, 0);
      let preDiscount = moneyPreview.preDiscount;
      if (preDiscount <= 0 && typeof total === "number" && total > 0) {
        preDiscount = subtotalFromGrossTotal(Math.round(total * 100));
      }

      if (appliedPromo) {
        if (preDiscount < (appliedPromo.minOrderPaise || 0)) {
          return NextResponse.json(
            {
              error: `Minimum order ₹${Math.round((appliedPromo.minOrderPaise || 0) / 100).toLocaleString("en-IN")} for this promo`,
            },
            { status: 422 }
          );
        }
        discountPaise = computePromoDiscount(preDiscount, appliedPromo);
      }

      const priced = totalsAfterDiscount(preDiscount, Math.max(0, discountPaise));
      updateData.subtotal = priced.subtotal;
      updateData.discount = priced.discount;
      updateData.discountNote = nextNote;
      updateData.promoCodeId = nextPromoId;
      updateData.gst = priced.gst;
      updateData.total = priced.total;
      updateData.balance = Math.max(0, priced.total - booking.advancePaid);
    }

    const updated = await db.$transaction(async (tx) => {
      if (promoCode !== undefined) {
        const prevId = booking.promoCodeId;
        if (prevId && prevId !== nextPromoId) {
          await tx.promoCode.updateMany({
            where: { id: prevId, usedCount: { gt: 0 } },
            data: { usedCount: { decrement: 1 } },
          });
        }
        if (nextPromoId && prevId !== nextPromoId) {
          await tx.promoCode.update({
            where: { id: nextPromoId },
            data: { usedCount: { increment: 1 } },
          });
        }
      }
      return tx.booking.update({
        where: { id: bookingId },
        data: updateData,
        include: { promoCode: true },
      });
    });

    return NextResponse.json({ booking: updated });
  } catch (e: unknown) {
    console.error("[bookings PATCH]", e);
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
