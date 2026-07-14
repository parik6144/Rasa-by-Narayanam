// Booking: list (GET) + create (POST)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  computePromoDiscount,
  findValidPromo,
  promoDiscountNote,
  subtotalFromGrossTotal,
  totalsAfterDiscount,
} from "@/lib/promo";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const bookings = await db.booking.findMany({
      where: { userId: user.id },
      orderBy: { eventDate: "desc" },
      include: {
        package: true,
        promoCode: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    });
    return NextResponse.json({ bookings });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load bookings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const {
      packageId, eventDate, venue, city, guests, total, advancePaid,
      menuSnapshot, addonsSnapshot, customDishes, occasion, notes, promoCode,
    } = body as {
      packageId?: string; eventDate?: string; venue?: string; city?: string; guests?: number;
      total?: number; advancePaid?: number; menuSnapshot?: unknown; addonsSnapshot?: unknown;
      customDishes?: string[]; occasion?: string; notes?: string; promoCode?: string;
    };

    if (!eventDate || !venue || !city || !guests) {
      return NextResponse.json({ error: "Missing required fields: date, venue, city, guests" }, { status: 422 });
    }

    let dbPkgId: string | null = null;
    if (packageId) {
      const pkg =
        (await db.package.findUnique({ where: { slug: packageId } }).catch(() => null)) ||
        (await db.package.findFirst({ where: { OR: [{ slug: packageId }, { id: packageId }] } }).catch(() => null));
      if (pkg) dbPkgId = pkg.id;
    }

    void advancePaid;
    const grossPaise = Math.round((total || 0) * 100);
    let subtotalPre = subtotalFromGrossTotal(grossPaise);
    let discount = 0;
    let discountNote: string | null = null;
    let promoCodeId: string | null = null;

    if (promoCode) {
      const promo = await findValidPromo(promoCode);
      if (!promo) {
        return NextResponse.json({ error: "Invalid or expired promo code" }, { status: 422 });
      }
      if (subtotalPre < (promo.minOrderPaise || 0)) {
        return NextResponse.json(
          {
            error: `Minimum order ₹${Math.round((promo.minOrderPaise || 0) / 100).toLocaleString("en-IN")} for this promo`,
          },
          { status: 422 }
        );
      }
      discount = computePromoDiscount(subtotalPre, promo);
      discountNote = promoDiscountNote(promo);
      promoCodeId = promo.id;
    }

    const priced = totalsAfterDiscount(subtotalPre, discount);
    const bookingRef = "RASA-" + Math.random().toString(36).slice(2, 8).toUpperCase();

    const booking = await db.$transaction(async (tx) => {
      if (promoCodeId) {
        await tx.promoCode.update({
          where: { id: promoCodeId },
          data: { usedCount: { increment: 1 } },
        });
      }
      return tx.booking.create({
        data: {
          bookingRef,
          userId: user.id,
          packageId: dbPkgId,
          eventDate: new Date(eventDate),
          venue: String(venue).slice(0, 500),
          city: String(city).slice(0, 120),
          guests,
          status: "confirmed",
          subtotal: priced.subtotal,
          discount: priced.discount,
          discountNote,
          promoCodeId,
          gst: priced.gst,
          total: priced.total,
          advancePaid: 0,
          balance: priced.total,
          menuSnapshot: JSON.stringify(menuSnapshot || {}),
          addonsSnapshot: JSON.stringify(addonsSnapshot || {}),
          customDishes: customDishes ? JSON.stringify(customDishes) : null,
          occasion: occasion || null,
          notes: notes || null,
        },
        include: { promoCode: true },
      });
    });

    return NextResponse.json({ booking });
  } catch (e: unknown) {
    console.error("[bookings POST]", e);
    const msg = e instanceof Error ? e.message : "Booking failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
