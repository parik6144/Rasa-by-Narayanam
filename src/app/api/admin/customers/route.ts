// Admin: all customers
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { authErrorResponse } from "@/lib/api-auth";

export async function GET() {
  let user;
  try {
    user = await requirePermission("customers.read");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }
  const customers = await db.user.findMany({
    where: { role: "customer" },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { bookings: true } },
      bookings: { select: { total: true }, take: 50 },
    },
  });
  const showLtv = hasPermission(user.role, "customers.ltv");
  const enriched = customers.map((c) => ({
    id: c.id,
    email: c.email,
    name: c.name,
    phone: c.phone,
    city: c.city,
    createdAt: c.createdAt,
    bookingCount: c._count.bookings,
    ltv: showLtv ? c.bookings.reduce((sum, b) => sum + b.total, 0) : null,
  }));
  return NextResponse.json({ customers: enriched });
}
