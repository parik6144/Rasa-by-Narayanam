import { db } from "@/lib/db";

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/** Local/demo without real Stripe keys — still lets customers use the Stripe button. */
export function stripeDemoMode(): boolean {
  if (stripeConfigured()) return false;
  return process.env.STRIPE_DEMO_MODE === "true" || process.env.NODE_ENV !== "production";
}

export async function getSiteSettings() {
  let row = await db.siteSettings.findUnique({ where: { id: "default" } });
  if (!row) {
    row = await db.siteSettings.create({
      data: { id: "default", paymentsEnabled: true },
    });
  }
  return row;
}

/** Remaining payable balance in paise (total - advancePaid), ignoring pending claims. */
export function remainingBalancePaise(booking: { total: number; advancePaid: number }): number {
  return Math.max(0, booking.total - booking.advancePaid);
}

/**
 * Idempotent: mark payment success and apply amount to booking.
 * Safe to call twice (second call is no-op if already success).
 */
export async function applySuccessfulPayment(
  paymentId: string,
  opts?: { confirmedBy?: string | null }
) {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error("Payment not found");
    if (payment.status === "success") {
      return { payment, alreadyApplied: true as const };
    }
    if (payment.status === "cancelled" || payment.status === "failed") {
      throw new Error(`Cannot approve payment in status ${payment.status}`);
    }

    const booking = await tx.booking.findUnique({ where: { id: payment.bookingId } });
    if (!booking) throw new Error("Booking not found");

    const remaining = remainingBalancePaise(booking);
    const applyAmt = Math.min(payment.amount, remaining);
    if (applyAmt <= 0) {
      const cancelled = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "cancelled",
          note: payment.note
            ? `${payment.note}\n[Auto-cancelled: balance already cleared]`
            : "[Auto-cancelled: balance already cleared]",
          confirmedBy: opts?.confirmedBy ?? payment.confirmedBy,
          confirmedAt: new Date(),
        },
      });
      return { payment: cancelled, alreadyApplied: false as const, cancelled: true as const };
    }

    const newAdvance = booking.advancePaid + applyAmt;
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "success",
        amount: applyAmt,
        confirmedBy: opts?.confirmedBy ?? payment.confirmedBy,
        confirmedAt: new Date(),
      },
    });

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        advancePaid: newAdvance,
        balance: Math.max(0, booking.total - newAdvance),
      },
    });

    return { payment: updatedPayment, alreadyApplied: false as const };
  });
}

export async function notifyAdminsOfPaymentClaim(opts: {
  bookingRef: string;
  amountPaise: number;
  paymentId: string;
  customerName?: string | null;
}) {
  const admins = await db.user.findMany({
    where: { role: { in: ["admin", "manager"] }, isActive: true },
    select: { id: true },
  });
  const rupees = Math.round(opts.amountPaise / 100);
  const title = "UPI payment claim";
  const body = `${opts.customerName || "Customer"} claimed ₹${rupees.toLocaleString("en-IN")} for ${opts.bookingRef}. Review in Payments.`;
  await Promise.all(
    admins.map((a) =>
      db.notification.create({
        data: {
          userId: a.id,
          type: "payment_claim",
          title,
          body,
          link: "/admin#payments",
          meta: JSON.stringify({ paymentId: opts.paymentId }),
        },
      })
    )
  );
}
