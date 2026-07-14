import Stripe from "stripe";
import { stripeConfigured } from "@/lib/payments";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!stripeConfigured()) return null;
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim());
  }
  return _stripe;
}
