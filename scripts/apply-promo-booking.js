const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

function addonLineTotal(a, guests) {
  const price = Number(a.price) || 0;
  const paise = price < 5000 ? price * 100 : price;
  const type = a.priceType || "per_event";
  const floor = Number(a.guestRange) || 0;
  if (type === "per_guest") {
    const billed = Math.max(guests, floor);
    return paise * billed;
  }
  return paise;
}

async function main() {
  const bookingId = process.argv[2] || "cmrl13pmx020fuowgpi0wt844";
  const code = (process.argv[3] || "FLAT5K").toUpperCase();
  const booking = await p.booking.findUnique({
    where: { id: bookingId },
    include: { package: true },
  });
  if (!booking) throw new Error("booking missing");
  const promo = await p.promoCode.findUnique({ where: { code } });
  if (!promo) throw new Error("promo missing: " + code);

  const guests = booking.guests;
  const packageLine = (booking.package?.price || 0) * guests;
  let addonsTotal = 0;
  try {
    const addons = JSON.parse(booking.addonsSnapshot || "[]");
    if (Array.isArray(addons)) {
      addonsTotal = addons.reduce((sum, a) => sum + addonLineTotal(a, guests), 0);
    }
  } catch {
    /* ignore */
  }
  let pre = packageLine + addonsTotal;
  if (pre <= 0) {
    // fall back to stored: treat as gross if discount was double-counted historically
    pre = Math.max(booking.subtotal || 0, (booking.subtotal || 0) + (booking.discount || 0));
    // prefer closer to package estimate — if stored subtotal alone is larger than package+addons miss, use subtotal only when discount is 0 or subtotal ~ known
    if (booking.discount > 0 && booking.subtotal > 0) {
      // Heuristic: if subtotal+discount inflated, use subtotal as gross
      pre = booking.subtotal;
    }
  }

  let discount = 0;
  if (promo.type === "percent") {
    discount = Math.round((pre * promo.value) / 100);
    if (promo.maxDiscountPaise) discount = Math.min(discount, promo.maxDiscountPaise);
  } else {
    discount = promo.value;
  }
  discount = Math.min(discount, pre);
  const after = pre - discount;
  const gst = Math.round(after * 0.05);
  const total = after + gst;
  const note =
    promo.type === "percent"
      ? `PROMO ${promo.code} · ${promo.label} (${promo.value}% off)`
      : `PROMO ${promo.code} · ${promo.label} (₹${Math.round(promo.value / 100).toLocaleString("en-IN")} off)`;

  const updated = await p.booking.update({
    where: { id: bookingId },
    data: {
      promoCodeId: promo.id,
      discount,
      discountNote: note,
      subtotal: after,
      gst,
      total,
      balance: Math.max(0, total - booking.advancePaid),
    },
  });

  if (booking.promoCodeId !== promo.id) {
    if (booking.promoCodeId) {
      await p.promoCode.updateMany({
        where: { id: booking.promoCodeId, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }
    await p.promoCode.update({
      where: { id: promo.id },
      data: { usedCount: { increment: 1 } },
    });
  }

  console.log(
    JSON.stringify(
      {
        ref: updated.bookingRef,
        packageLineRupees: Math.round(packageLine / 100),
        addonsRupees: Math.round(addonsTotal / 100),
        preDiscountRupees: Math.round(pre / 100),
        discountRupees: Math.round(discount / 100),
        discountNote: updated.discountNote,
        totalRupees: Math.round(updated.total / 100),
        balanceRupees: Math.round(updated.balance / 100),
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
