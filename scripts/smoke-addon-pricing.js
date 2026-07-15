/** Quick smoke test for addon guest-range + variety billing */
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
  return unit; // per_event / flat
}

const guests = 100;
const cases = [
  {
    name: "Hostess (per event)",
    price: 6600,
    priceType: "per_event",
    guestRange: 500,
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
    name: "Shake 1 variety",
    price: 54,
    priceType: "per_variety",
    guestRange: 500,
    choice: ["Vanilla"],
    expect: 27000,
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
    name: "Molecular Express (per event)",
    price: 49500,
    priceType: "per_event",
    guestRange: 500,
    expect: 49500,
  },
];

let ok = true;
for (const a of cases) {
  const line = addonLineTotal(a, guests);
  const pass = line === a.expect;
  if (!pass) ok = false;
  console.log(`${pass ? "OK" : "FAIL"} ${a.name}: ${line} (expected ${a.expect})`);
}

const above = addonLineTotal(
  { price: 110, priceType: "per_guest", guestRange: 500 },
  600
);
const abovePass = above === 66000;
if (!abovePass) ok = false;
console.log(`${abovePass ? "OK" : "FAIL"} Dim Sum @600 guests: ${above} (expected 66000)`);

process.exit(ok ? 0 : 1);
