/** Quick smoke test for addon guest-range + variety + event pro-rata billing */
function billableGuests(guests, guestRange) {
  const actual = Math.max(0, Number(guests) || 0);
  const range = Math.max(0, Number(guestRange) || 0);
  if (range > 0) return Math.max(actual, range);
  return actual;
}

function varietyQty(addon) {
  if (addon.varietyCount != null && Number(addon.varietyCount) > 0) {
    return Math.max(1, Math.round(Number(addon.varietyCount)));
  }
  const choice = addon.choice;
  const n = Array.isArray(choice)
    ? choice.length
    : typeof choice === "string" && choice.trim()
      ? 1
      : 0;
  return Math.max(1, n);
}

function isFixedHostessAddon(addon) {
  const hay = `${addon.id || ""} ${addon.name || ""}`.toLowerCase();
  return hay.includes("hostess");
}

function addonLineTotal(addon, guests) {
  const unit = Number(addon.price) || 0;
  const range = Math.max(0, Number(addon.guestRange) || 0);
  const billed = billableGuests(guests, range);
  const actual = Math.max(0, Number(guests) || 0);

  if (addon.priceType === "per_guest") {
    return unit * (range > 0 ? billed : actual);
  }
  if (addon.priceType === "per_variety") {
    return unit * varietyQty(addon) * (range > 0 ? billed : actual);
  }
  if (addon.priceType === "per_event") {
    if (isFixedHostessAddon(addon)) return unit;
    const slab = range > 0 ? range : 500;
    if (actual <= slab) return unit;
    return Math.round((unit * actual) / slab);
  }
  return unit;
}

const guests = 100;
const cases = [
  {
    name: "Hostess (fixed event)",
    price: 6600,
    priceType: "per_event",
    guestRange: 500,
    id: "greet-namaskar-by-hostess",
    expect: 6600,
  },
  {
    name: "Dim Sum (per guest)",
    price: 110,
    priceType: "per_guest",
    guestRange: 500,
    expect: 55000,
  },
  {
    name: "Shake 5 varieties",
    price: 54,
    priceType: "per_variety",
    guestRange: 500,
    choice: ["Vanilla", "Chocolate", "Strawberry", "Mango", "Oreo"],
    expect: 135000,
  },
  {
    name: "Molecular @100 (within 500)",
    price: 49500,
    priceType: "per_event",
    guestRange: 500,
    expect: 49500,
  },
  {
    name: "Molecular @600 (pro-rata)",
    price: 49500,
    priceType: "per_event",
    guestRange: 500,
    guests: 600,
    expect: 59400,
  },
  {
    name: "Hostess @600 (still fixed)",
    price: 6600,
    priceType: "per_event",
    guestRange: 500,
    id: "greet-namaskar-by-hostess",
    guests: 600,
    expect: 6600,
  },
];

let ok = true;
for (const a of cases) {
  const g = a.guests != null ? a.guests : guests;
  const line = addonLineTotal(a, g);
  const pass = line === a.expect;
  if (!pass) ok = false;
  console.log(`${pass ? "OK" : "FAIL"} ${a.name}: ${line} (expected ${a.expect})`);
}

process.exit(ok ? 0 : 1);
