/** Min billable guests for per_guest add-ons. 0 / missing = use actual guests. */
export function billableGuests(guests: number, guestRange?: number | null): number {
  const actual = Math.max(0, Number(guests) || 0);
  const range = Math.max(0, Number(guestRange) || 0);
  if (range > 0) return Math.max(actual, range);
  return actual;
}

export type AddonPriceInput = {
  price: number;
  priceType?: string | null;
  guestRange?: number | null;
  name?: string | null;
};

/** Line total in the same units as `price` (rupees or paise — caller decides). */
export function addonLineTotal(addon: AddonPriceInput, guests: number): number {
  const unit = Number(addon.price) || 0;
  if (addon.priceType === "per_guest") {
    return unit * billableGuests(guests, addon.guestRange);
  }
  return unit;
}

/** True when guestRange floors the count above actual guests. */
export function addonUsesGuestFloor(guests: number, guestRange?: number | null): boolean {
  const range = Math.max(0, Number(guestRange) || 0);
  return range > 0 && billableGuests(guests, range) > Math.max(0, Number(guests) || 0);
}

/** Short badge for catalogs / lists (per_guest + range only). */
export function addonMinGuestsBadge(addon: AddonPriceInput): string | null {
  const range = Math.max(0, Number(addon.guestRange) || 0);
  if (addon.priceType !== "per_guest" || range <= 0) return null;
  return `Min ${range} guests`;
}

/**
 * Human-readable pricing note for marketing / admin / picker UIs.
 * Pass `guests` when known so the line mirrors quotation math.
 */
export function addonPricingNote(addon: AddonPriceInput, guests?: number | null): string | null {
  const range = Math.max(0, Number(addon.guestRange) || 0);
  if (addon.priceType !== "per_guest" || range <= 0) return null;
  const unit = Number(addon.price) || 0;
  const unitFmt = unit.toLocaleString("en-IN");
  const rangeFmt = range.toLocaleString("en-IN");

  if (guests != null && Number.isFinite(Number(guests)) && Number(guests) > 0) {
    const actual = Math.max(0, Number(guests) || 0);
    const billed = billableGuests(actual, range);
    const line = unit * billed;
    const lineFmt = line.toLocaleString("en-IN");
    if (billed > actual) {
      return `Your party has ${actual.toLocaleString("en-IN")} guests, but this add-on is billed for at least ${rangeFmt} — ₹${unitFmt} × ${billed.toLocaleString("en-IN")} = ₹${lineFmt}.`;
    }
    return `Billed for ${billed.toLocaleString("en-IN")} guests at ₹${unitFmt}/guest = ₹${lineFmt}.`;
  }

  return `Priced per guest, with a minimum charge of ${rangeFmt} guests (₹${unitFmt} × ${rangeFmt} = ₹${(unit * range).toLocaleString("en-IN")}), even if your count is lower.`;
}
