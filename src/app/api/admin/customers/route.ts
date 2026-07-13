// Admin: all customers
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const customers = await db.user.findMany({
    where: { role: "customer" },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { bookings: true } },
      bookings: { select: { total: true }, take: 50 },
    },
  });
  const enriched = customers.map(c => ({
    id: c.id,
    email: c.email,
    name: c.name,
    phone: c.phone,
    city: c.city,
    createdAt: c.createdAt,
    bookingCount: c._count.bookings,
    ltv: c.bookings.reduce((sum, b) => sum + b.total, 0),
  }));
  return NextResponse.json({ customers: enriched });
}
