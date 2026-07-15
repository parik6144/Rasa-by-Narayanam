/** Min billable guests when guestRange is set. 0 / missing = use actual guests. */
export function billableGuests(guests: number, guestRange?: number | null): number {
  const actual = Math.max(0, Number(guests) || 0);
  const range = Math.max(0, Number(guestRange) || 0);
  if (range > 0) return Math.max(actual, range);
  return actual;
}

export type AddonChoiceValue = string | string[] | null | undefined;

export type AddonPriceInput = {
  price: number;
  priceType?: string | null;
  guestRange?: number | null;
  name?: string | null;
  /** Selected variety name(s) — used for per_variety quantity */
  choice?: AddonChoiceValue;
  /** Explicit variety count override (defaults from choice list) */
  varietyCount?: number | null;
};

/** Normalize stored choice to a list of selected variety names. */
export function normalizeAddonChoices(choice: AddonChoiceValue): string[] {
  if (Array.isArray(choice)) {
    return choice.map((c) => String(c || "").trim()).filter(Boolean);
  }
  if (typeof choice === "string" && choice.trim()) {
    // Comma-separated legacy snapshots
    if (choice.includes(" · ")) {
      return choice.split(" · ").map((s) => s.trim()).filter(Boolean);
    }
    return [choice.trim()];
  }
  return [];
}

/** How many varieties to bill (at least 1 when the add-on is on the quotation). */
export function varietyQty(addon: AddonPriceInput): number {
  if (addon.varietyCount != null && Number(addon.varietyCount) > 0) {
    return Math.max(1, Math.round(Number(addon.varietyCount)));
  }
  const n = normalizeAddonChoices(addon.choice).length;
  return Math.max(1, n);
}

/** True when guest min floor applies to this price type. */
export function addonUsesGuestMinimum(priceType?: string | null): boolean {
  return priceType === "per_guest" || priceType === "per_variety";
}

/** True when this price type scales with guest count (min floor). */
export function addonScalesWithGuests(priceType?: string | null): boolean {
  return addonUsesGuestMinimum(priceType);
}

/** True when guestRange floors the count above actual guests. */
export function addonUsesGuestFloor(guests: number, guestRange?: number | null): boolean {
  const range = Math.max(0, Number(guestRange) || 0);
  return range > 0 && billableGuests(guests, range) > Math.max(0, Number(guests) || 0);
}

function unitLabel(priceType?: string | null): string {
  if (priceType === "per_guest") return "/guest";
  if (priceType === "per_variety") return "/variety";
  if (priceType === "per_event") return "/event";
  return "";
}

/**
 * Line total in the same units as `price` (rupees or paise — caller decides).
 *
 * Formal rules:
 * - per_event / flat: charge unit price once (never × guests / min)
 * - per_guest: unit × max(actualGuests, guestRange)
 * - per_variety: unit × varietyCount × max(actualGuests, guestRange)
 *   e.g. ₹54 × 5 shakes × 500 min = ₹1,35,000
 */
export function addonLineTotal(addon: AddonPriceInput, guests: number): number {
  const unit = Number(addon.price) || 0;
  const range = Math.max(0, Number(addon.guestRange) || 0);
  const billed = billableGuests(guests, range);
  const actual = Math.max(0, Number(guests) || 0);

  if (addon.priceType === "per_guest") {
    return unit * (range > 0 ? billed : actual);
  }

  if (addon.priceType === "per_variety") {
    const qty = varietyQty(addon);
    return unit * qty * (range > 0 ? billed : actual);
  }

  // per_event | flat | unknown — single charge
  return unit;
}

/** Short badge for catalogs / lists when a minimum guest slab applies. */
export function addonMinGuestsBadge(addon: AddonPriceInput): string | null {
  const range = Math.max(0, Number(addon.guestRange) || 0);
  if (range <= 0 || !addonUsesGuestMinimum(addon.priceType)) return null;
  return `Min ${range} guests`;
}

/**
 * Human-readable pricing note for booking / quotation UIs.
 * Pass `guests` when known so the line mirrors quotation math.
 */
export function addonPricingNote(addon: AddonPriceInput, guests?: number | null): string | null {
  const unit = Number(addon.price) || 0;
  const unitFmt = unit.toLocaleString("en-IN");
  const range = Math.max(0, Number(addon.guestRange) || 0);
  const rangeFmt = range.toLocaleString("en-IN");

  if (addon.priceType === "per_event" || addon.priceType === "flat") {
    return `Flat ₹${unitFmt} per event — charged once, not multiplied by guests.`;
  }

  if (addon.priceType === "per_guest") {
    if (range <= 0) {
      if (guests != null && Number(guests) > 0) {
        const actual = Math.max(0, Number(guests) || 0);
        const line = unit * actual;
        return `₹${unitFmt}/guest × ${actual.toLocaleString("en-IN")} guests = ₹${line.toLocaleString("en-IN")}.`;
      }
      return null;
    }
    if (guests != null && Number.isFinite(Number(guests)) && Number(guests) > 0) {
      const actual = Math.max(0, Number(guests) || 0);
      const billed = billableGuests(actual, range);
      const line = unit * billed;
      if (billed > actual) {
        return `Note: your guest count is ${actual.toLocaleString("en-IN")}, but min chargeable is ${rangeFmt}. Calculation: ₹${unitFmt} × ${billed.toLocaleString("en-IN")} = ₹${line.toLocaleString("en-IN")}.`;
      }
      return `₹${unitFmt}/guest × ${billed.toLocaleString("en-IN")} guests = ₹${line.toLocaleString("en-IN")}.`;
    }
    return `₹${unitFmt}/guest with a minimum of ${rangeFmt} guests (₹${unitFmt} × ${rangeFmt} = ₹${(unit * range).toLocaleString("en-IN")}), even if your count is lower.`;
  }

  if (addon.priceType === "per_variety") {
    const qty = varietyQty(addon);
    const picks = normalizeAddonChoices(addon.choice);
    const qtyLabel = qty === 1 ? "1 variety" : `${qty} varieties`;
    if (range <= 0) {
      if (guests != null && Number(guests) > 0) {
        const actual = Math.max(0, Number(guests) || 0);
        const line = unit * qty * actual;
        return `₹${unitFmt}/variety × ${qtyLabel} × ${actual.toLocaleString("en-IN")} guests = ₹${line.toLocaleString("en-IN")}.`;
      }
      return `₹${unitFmt} per variety × number of varieties you pick × your guest count.`;
    }
    if (guests != null && Number.isFinite(Number(guests)) && Number(guests) > 0) {
      const actual = Math.max(0, Number(guests) || 0);
      const billed = billableGuests(actual, range);
      const line = unit * qty * billed;
      const pickNote = picks.length > 0 ? ` (selected: ${picks.join(", ")})` : " — pick varieties below";
      if (billed > actual) {
        return `Note: your guest count is ${actual.toLocaleString("en-IN")}, but min chargeable is ${rangeFmt}. Calculation: ₹${unitFmt} × ${qty} variety${qty > 1 ? "ies" : ""} × ${billed.toLocaleString("en-IN")} = ₹${line.toLocaleString("en-IN")}${pickNote}.`;
      }
      return `₹${unitFmt} × ${qtyLabel} × ${billed.toLocaleString("en-IN")} guests = ₹${line.toLocaleString("en-IN")}${pickNote}.`;
    }
    return `₹${unitFmt} per variety × varieties selected × min ${rangeFmt} guests (e.g. 1 variety = ₹${(unit * range).toLocaleString("en-IN")}; 5 varieties = ₹${(unit * 5 * range).toLocaleString("en-IN")}).`;
  }

  return null;
}

/** Estimated line label for addon cards when guest count is known. */
export function addonEstimatedLineLabel(addon: AddonPriceInput, guests: number): string | null {
  if (addon.priceType === "per_event" || addon.priceType === "flat") {
    return `₹${(Number(addon.price) || 0).toLocaleString("en-IN")} flat / event`;
  }
  if (!addonScalesWithGuests(addon.priceType)) return null;
  const line = addonLineTotal(addon, guests);
  if (addon.priceType === "per_variety") {
    const qty = varietyQty(addon);
    return `Est. ₹${line.toLocaleString("en-IN")} (${qty} variety${qty > 1 ? "ies" : ""})`;
  }
  return `Est. ₹${line.toLocaleString("en-IN")} for your party`;
}

/** Display string for stored choice on quotations. */
export function formatAddonChoiceLabel(choice: AddonChoiceValue): string {
  const list = normalizeAddonChoices(choice);
  return list.join(", ");
}
