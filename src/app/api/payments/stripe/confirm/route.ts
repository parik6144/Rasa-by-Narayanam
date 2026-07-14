import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { applySuccessfulPayment, stripeConfigured } from "@/lib/payments";

/** After Checkout redirect — sync session when webhook is delayed/missing locally. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await req.json();
  const sessionId = String(body.sessionId || "");
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 422 });

  const stripe = getStripe()!;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid" && session.status !== "complete") {
    return NextResponse.json({ error: "Payment not completed", status: session.payment_status }, { status: 409 });
  }

  const paymentId = session.metadata?.paymentId;
  const payment = paymentId
    ? await db.payment.findUnique({ where: { id: paymentId } })
    : await db.payment.findFirst({ where: { gatewayTxn: sessionId } });

  if (!payment) return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
  if (payment.userId !== user.id && user.role === "customer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await applySuccessfulPayment(payment.id);
  const booking = await db.booking.findUnique({ where: { id: payment.bookingId } });
  return NextResponse.json({ ok: true, payment: result.payment, booking });
}
