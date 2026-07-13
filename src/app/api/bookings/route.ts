// Booking: list (GET) + create (POST)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const bookings = await db.booking.findMany({
    where: { userId: user.id },
    orderBy: { eventDate: "desc" },
    include: { package: true, payments: true },
  });
  return NextResponse.json({ bookings });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { packageId, eventDate, venue, city, guests, total, advancePaid, menuSnapshot, addonsSnapshot, customDishes, occasion, notes } = body as {
    packageId?: string; eventDate?: string; venue?: string; city?: string; guests?: number;
    total?: number; advancePaid?: number; menuSnapshot?: unknown; addonsSnapshot?: unknown;
    customDishes?: string[]; occasion?: string; notes?: string;
  };
  if (!eventDate || !venue || !city || !guests) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 422 });
  }
  let dbPkgId: string | null = null;
  if (packageId) {
    const pkg = await db.package.findUnique({ where: { slug: packageId } });
    if (pkg) dbPkgId = pkg.id;
  }
  const totalAmt = (total || 0) * 100;
  const advance = (advancePaid || 0) * 100;
  const gst = Math.round((totalAmt - totalAmt / 1.05));
  const subtotal = totalAmt - gst;
  const bookingRef = "RASA-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const booking = await db.booking.create({
    data: {
      bookingRef,
      userId: user.id,
      packageId: dbPkgId,
      eventDate: new Date(eventDate),
      venue, city, guests,
      status: "confirmed",
      subtotal,
      gst,
      total: totalAmt,
      advancePaid: advance,
      balance: totalAmt - advance,
      menuSnapshot: JSON.stringify(menuSnapshot || {}),
      addonsSnapshot: JSON.stringify(addonsSnapshot || {}),
      customDishes: customDishes ? JSON.stringify(customDishes) : null,
      occasion: occasion || null,
      notes: notes || null,
    },
  });
  // mock payment record
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
}
