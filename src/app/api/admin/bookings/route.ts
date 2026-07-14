// Admin: all bookings
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, requireStaff } from "@/lib/auth";
import { authErrorResponse } from "@/lib/api-auth";

export async function GET() {
  try {
    await requireStaff();
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }
  const bookings = await db.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      package: true,
      payments: { orderBy: { createdAt: "desc" } },
    },
    take: 100,
  });
  return NextResponse.json({ bookings });
}

// Update booking status
export async function PATCH(req: Request) {
  try {
    await requirePermission("bookings.write");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }
  const body = await req.json();
  const { id, status } = body as { id?: string; status?: string };
  if (!id || !status) return NextResponse.json({ error: "Missing fields" }, { status: 422 });
  const updated = await db.booking.update({ where: { id }, data: { status } });
  return NextResponse.json({ booking: updated });
}
