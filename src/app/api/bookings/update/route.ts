// Booking update — within edit window before event
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CONFIG } from "@/lib/rasa-data";

/** Snapshot addon prices from the wizard are in rupees; normalize to paise. */
function addonLinePaise(
  a: { price?: number; priceType?: string },
  guests: number
): number {
  if (!a.price) return 0;
  const paise = a.price < 5000 ? a.price * 100 : a.price;
  if (a.priceType === "per_guest") return paise * guests;
  return paise;
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      bookingId, guests, venue, city, notes, menuSnapshot, addonsSnapshot,
      customDishes, discount, discountNote, occasion, eventDate, total, advancePaid,
    } = body as {
      bookingId?: string; guests?: number; venue?: string; city?: string; notes?: string;
      menuSnapshot?: unknown; addonsSnapshot?: unknown; customDishes?: unknown;
      discount?: number; discountNote?: string; occasion?: string; eventDate?: string;
      total?: number; advancePaid?: number;
    };

    if (!bookingId) return NextResponse.json({ error: "Missing bookingId" }, { status: 422 });

    const booking = await db.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const isOwner = booking.userId === user.id;
    const isAdmin = user.role === "admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isAdmin) {
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

    if (isAdmin) {
      if (discount !== undefined) updateData.discount = discount * 100;
      if (discountNote !== undefined) updateData.discountNote = discountNote;
    }

    // Prefer client-computed total (rupees) when provided — matches create booking flow
    if (typeof total === "number" && total > 0) {
      const totalAmt = Math.round(total * 100);
      const gst = Math.round(totalAmt - totalAmt / (1 + CONFIG.gstPercent / 100));
      const subtotal = totalAmt - gst;
      updateData.subtotal = subtotal;
      updateData.gst = gst;
      updateData.total = totalAmt;
      updateData.balance = totalAmt - booking.advancePaid;
    } else if (
      guests !== undefined ||
      addonsSnapshot !== undefined ||
      (isAdmin && discount !== undefined)
    ) {
      const pkg = booking.packageId
        ? await db.package.findUnique({ where: { id: booking.packageId } })
        : null;
      const guestCount = guests ?? booking.guests;
      const packageLine = (pkg?.price || 0) * guestCount; // paise
      const addonsJson = updateData.addonsSnapshot
        ? JSON.parse(updateData.addonsSnapshot as string)
        : JSON.parse(booking.addonsSnapshot || "[]");
      const addonsTotal = Array.isArray(addonsJson)
        ? addonsJson.reduce(
            (sum: number, a: { price?: number; priceType?: string }) =>
              sum + addonLinePaise(a, guestCount),
            0
          )
        : 0;
      const discountAmt =
        isAdmin && discount !== undefined ? discount * 100 : booking.discount;
      const afterDiscount = Math.max(0, packageLine + addonsTotal - discountAmt);
      const gst = Math.round(afterDiscount * (CONFIG.gstPercent / 100));
      const totalAmt = afterDiscount + gst;
      updateData.subtotal = afterDiscount;
      updateData.gst = gst;
      updateData.total = totalAmt;
      updateData.balance = totalAmt - booking.advancePaid;
    }

    const updated = await db.booking.update({
      where: { id: bookingId },
      data: updateData,
    });

    return NextResponse.json({ booking: updated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
