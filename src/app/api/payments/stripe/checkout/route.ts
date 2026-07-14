import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import {
  applySuccessfulPayment,
  remainingBalancePaise,
  stripeConfigured,
  stripeDemoMode,
} from "@/lib/payments";
import { isStaffRole } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const bookingId = String(body.bookingId || "");
  const amountRupees = Number(body.amountRupees);
  if (!bookingId || !Number.isFinite(amountRupees) || amountRupees < 1) {
    return NextResponse.json({ error: "bookingId and amountRupees (>=1) required" }, { status: 422 });
  }

  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.userId !== user.id && !isStaffRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const remaining = remainingBalancePaise(booking);
  // Heal stale balance column so My Bookings UI stays in sync
  if (booking.balance !== remaining) {
    await db.booking.update({
      where: { id: booking.id },
      data: { balance: remaining },
    });
  }
  const amountPaise = Math.min(Math.round(amountRupees * 100), remaining);
  if (amountPaise < 100) {
    return NextResponse.json(
      {
        error:
          remaining <= 0
            ? "This booking is already fully paid (nothing left on the balance)."
            : "Amount too small — pay at least ₹1.",
        remainingRupees: Math.round(remaining / 100),
      },
      { status: 422 }
    );
  }

  const live = stripeConfigured() && getStripe();
  const demo = !live && stripeDemoMode();

  if (!live && !demo) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured. Add STRIPE_SECRET_KEY to .env (or set STRIPE_DEMO_MODE=true for local demo).",
      },
      { status: 503 }
    );
  }

  // Demo / local: simulate card success so customers can exercise the Stripe button without keys
  if (demo) {
    const payment = await db.payment.create({
      data: {
        bookingId: booking.id,
        userId: booking.userId,
        amount: amountPaise,
        method: "card",
        status: "pending",
        gateway: "stripe",
        gatewayTxn: `demo_cs_${Date.now()}`,
        note: "Demo Stripe payment (no live keys — local only)",
      },
    });
    await applySuccessfulPayment(payment.id);
    const updated = await db.booking.findUnique({ where: { id: booking.id } });
    return NextResponse.json({
      demo: true,
      paymentId: payment.id,
      booking: updated,
      message: "Demo card payment recorded. Add real STRIPE_SECRET_KEY for live Stripe Checkout.",
    });
  }

  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const payment = await db.payment.create({
    data: {
      bookingId: booking.id,
      userId: booking.userId,
      amount: amountPaise,
      method: "card",
      status: "pending",
      gateway: "stripe",
    },
  });

  const stripe = getStripe()!;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "inr",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "inr",
            unit_amount: amountPaise,
            product_data: {
              name: `Rasa booking ${booking.bookingRef}`,
              description: `Payment toward booking ${booking.bookingRef}`,
            },
          },
        },
      ],
      metadata: {
        paymentId: payment.id,
        bookingId: booking.id,
        userId: booking.userId,
      },
      success_url: `${origin}/?paid=1&bookingId=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?pay_cancelled=1&bookingId=${booking.id}`,
      customer_email: user.email || undefined,
    });

    await db.payment.update({
      where: { id: payment.id },
      data: { gatewayTxn: session.id },
    });

    return NextResponse.json({
      url: session.url,
      paymentId: payment.id,
      sessionId: session.id,
    });
  } catch (e) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "failed", note: e instanceof Error ? e.message : "Stripe error" },
    });
    console.error("[stripe checkout]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Stripe checkout failed" },
      { status: 502 }
    );
  }
}
