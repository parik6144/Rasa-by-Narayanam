import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { applySuccessfulPayment, stripeConfigured } from "@/lib/payments";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    if (secret) {
      const sig = req.headers.get("stripe-signature");
      if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
      event = stripe.webhooks.constructEvent(rawBody, sig, secret);
    } else if (process.env.NODE_ENV !== "production") {
      // Localdev without webhook secret — accept JSON body (never do this in prod)
      event = JSON.parse(rawBody) as Stripe.Event;
    } else {
      return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET required" }, { status: 503 });
    }
  } catch (e) {
    console.error("[stripe webhook verify]", e);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.paymentId;
      if (paymentId) {
        await applySuccessfulPayment(paymentId);
      } else if (session.id) {
        const payment = await db.payment.findFirst({ where: { gatewayTxn: session.id } });
        if (payment) await applySuccessfulPayment(payment.id);
      }
    }
  } catch (e) {
    console.error("[stripe webhook apply]", e);
    return NextResponse.json({ error: "Apply failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
