// Admin: all bookings
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const bookings = await db.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, package: true, payments: true },
    take: 100,
  });
  return NextResponse.json({ bookings });
}

// Update booking status
export async function PATCH(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { id, status } = body as { id?: string; status?: string };
  if (!id || !status) return NextResponse.json({ error: "Missing fields" }, { status: 422 });
  const updated = await db.booking.update({ where: { id }, data: { status } });
  return NextResponse.json({ booking: updated });
}
