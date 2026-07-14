import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { authErrorResponse } from "@/lib/api-auth";
import { applySuccessfulPayment } from "@/lib/payments";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("payments.read");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") || "pending";
  const where =
    statusFilter === "all"
      ? {}
      : { status: statusFilter };

  const payments = await db.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      booking: { select: { id: true, bookingRef: true, total: true, advancePaid: true, balance: true, eventDate: true } },
    },
  });

  return NextResponse.json({ payments });
}

export async function PATCH(req: NextRequest) {
  let staff;
  try {
    staff = await requirePermission("payments.approve");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }

  const body = await req.json();
  const id = String(body.id || "");
  const action = String(body.action || ""); // approve | reject
  if (!id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "id and action (approve|reject) required" }, { status: 422 });
  }

  const payment = await db.payment.findUnique({ where: { id } });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (payment.status !== "pending") {
    return NextResponse.json({ error: `Payment is already ${payment.status}` }, { status: 409 });
  }

  if (action === "reject") {
    const updated = await db.payment.update({
      where: { id },
      data: {
        status: "cancelled",
        confirmedBy: staff.id,
        confirmedAt: new Date(),
        note: body.reason
          ? `${payment.note || ""}\n[Rejected: ${String(body.reason)}]`.trim()
          : payment.note,
      },
    });
    return NextResponse.json({ payment: updated });
  }

  const result = await applySuccessfulPayment(id, { confirmedBy: staff.id });
  const booking = await db.booking.findUnique({ where: { id: payment.bookingId } });
  return NextResponse.json({ payment: result.payment, booking });
}
