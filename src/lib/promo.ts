import { db } from "@/lib/db";
import { CONFIG } from "@/lib/rasa-data";
import { addonLineTotal } from "@/lib/addon-pricing";

export type PromoType = "percent" | "fixed";

export type PromoLike = {
  id: string;
  code: string;
  label: string;
  type: string;
  value: number;
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
};

export function normalizeCode(code: string): string {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function computePromoDiscount(subtotalPaise: number, promo: PromoLike): number {
  const sub = Math.max(0, subtotalPaise);
  if (sub < (promo.minOrderPaise || 0)) return 0;
  let discount = 0;
  if (promo.type === "percent") {
    const pct = Math.min(100, Math.max(0, promo.value));
    discount = Math.round((sub * pct) / 100);
    if (promo.maxDiscountPaise != null && promo.maxDiscountPaise > 0) {
      discount = Math.min(discount, promo.maxDiscountPaise);
    }
  } else {
    // fixed: value stored in paise
    discount = Math.max(0, promo.value);
  }
  return Math.min(discount, sub);
}

export function totalsAfterDiscount(subtotalBeforeDiscountPaise: number, discountPaise: number) {
  const discount = Math.min(Math.max(0, discountPaise), Math.max(0, subtotalBeforeDiscountPaise));
  const after = Math.max(0, subtotalBeforeDiscountPaise - discount);
  const gst = Math.round(after * (CONFIG.gstPercent / 100));
  const total = after + gst;
  return { subtotal: after, discount, gst, total };
}

/** Client often sends total WITH GST included; derive pre-GST subtotal. */
export function subtotalFromGrossTotal(totalWithGstPaise: number): number {
  const t = Math.max(0, totalWithGstPaise);
  return Math.round(t / (1 + CONFIG.gstPercent / 100));
}

export async function findValidPromo(codeRaw: string): Promise<PromoLike | null> {
  const code = normalizeCode(codeRaw);
  if (!code) return null;
  const promo = await db.promoCode.findUnique({ where: { code } });
  if (!promo || !promo.isActive) return null;
  const now = new Date();
  if (promo.startsAt && promo.startsAt > now) return null;
  if (promo.endsAt && promo.endsAt < now) return null;
  if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) return null;
  return promo;
}

function addonLinePaise(
  a: {
    price?: number;
    priceType?: string;
    guestRange?: number;
    choice?: string | string[] | null;
    varietyCount?: number;
  },
  guests: number
): number {
  if (!a.price) return 0;
  const paise = a.price < 5000 ? a.price * 100 : a.price;
  return addonLineTotal(
    {
      price: paise,
      priceType: a.priceType,
      guestRange: a.guestRange,
      choice: a.choice,
      varietyCount: a.varietyCount,
    },
    guests
  );
}

/** Recompute money fields from package/addons snapshots + discount. */
export async function repriceBookingMoney(
  booking: {
    packageId: string | null;
    guests: number;
    advancePaid: number;
    subtotal?: number;
    discount?: number;
    total?: number;
    addonsSnapshot: string | null;
  },
  discountPaise: number
) {
  const pkg = booking.packageId
    ? await db.package.findUnique({ where: { id: booking.packageId } })
    : null;
  const packageLine = (pkg?.price || 0) * booking.guests;
  let addonsTotal = 0;
  try {
    const addons = JSON.parse(booking.addonsSnapshot || "[]");
    if (Array.isArray(addons)) {
      addonsTotal = addons.reduce(
        (
          sum: number,
          a: {
            price?: number;
            priceType?: string;
            guestRange?: number;
            choice?: string | string[] | null;
            varietyCount?: number;
          }
        ) => sum + addonLinePaise(a, booking.guests),
        0
      );
    }
  } catch {
    /* ignore */
  }
  let preDiscount = packageLine + addonsTotal;
  // Fallback when snapshots missing (seeded / custom bookings)
  if (preDiscount <= 0) {
    const stored =
      (booking.subtotal || 0) + (booking.discount || 0) ||
      (booking.total ? subtotalFromGrossTotal(booking.total) : 0);
    preDiscount = stored;
  }
  const { subtotal, discount, gst, total } = totalsAfterDiscount(preDiscount, discountPaise);
  const balance = Math.max(0, total - booking.advancePaid);
  return { subtotal, discount, gst, total, balance, preDiscount };
}

export function promoDiscountNote(promo: PromoLike): string {
  if (promo.type === "percent") {
    return `PROMO ${promo.code} · ${promo.label} (${promo.value}% off)`;
  }
  const rupees = Math.round(promo.value / 100);
  return `PROMO ${promo.code} · ${promo.label} (₹${rupees.toLocaleString("en-IN")} off)`;
}
