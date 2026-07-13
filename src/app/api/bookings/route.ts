// Booking: list (GET) + create (POST)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const bookings = await db.booking.findMany({
      where: { userId: user.id },
      orderBy: { eventDate: "desc" },
      include: { package: true, payments: true },
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
      menuSnapshot, addonsSnapshot, customDishes, occasion, notes,
    } = body as {
      packageId?: string; eventDate?: string; venue?: string; city?: string; guests?: number;
      total?: number; advancePaid?: number; menuSnapshot?: unknown; addonsSnapshot?: unknown;
      customDishes?: string[]; occasion?: string; notes?: string;
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

    const totalAmt = Math.round((total || 0) * 100);
    const advance = Math.round((advancePaid || 0) * 100);
    const gst = Math.round(totalAmt - totalAmt / 1.05);
    const subtotal = totalAmt - gst;
    const bookingRef = "RASA-" + Math.random().toString(36).slice(2, 8).toUpperCase();

    const booking = await db.booking.create({
      data: {
        bookingRef,
        userId: user.id,
        packageId: dbPkgId,
        eventDate: new Date(eventDate),
        venue: String(venue).slice(0, 500),
        city: String(city).slice(0, 120),
        guests,
        status: "confirmed",
        subtotal,
        gst,
        total: totalAmt,
        advancePaid: advance,
        balance: Math.max(0, totalAmt - advance),
        menuSnapshot: JSON.stringify(menuSnapshot || {}),
        addonsSnapshot: JSON.stringify(addonsSnapshot || {}),
        customDishes: customDishes ? JSON.stringify(customDishes) : null,
        occasion: occasion || null,
        notes: notes || null,
      },
    });

    if (advance > 0) {
      await db.payment.create({
        data: {
          bookingId: booking.id,
          userId: user.id,
          amount: advance,
          method: "upi",
          status: "success",
          gateway: "mock",
          gatewayTxn: "MOCK-" + Date.now(),
        },
      });
    }

    return NextResponse.json({ booking });
  } catch (e: unknown) {
    console.error("[bookings POST]", e);
    const msg = e instanceof Error ? e.message : "Booking failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
