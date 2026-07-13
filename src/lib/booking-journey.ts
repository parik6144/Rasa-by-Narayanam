// Customer booking journey helpers — edit cutoff + next-step guidance + soft upsell hooks
import { CONFIG } from "@/lib/rasa-data";
import type { Addon } from "@/lib/rasa-data";

export function daysUntilEvent(eventDate: string | Date): number {
  const d = typeof eventDate === "string" ? new Date(eventDate) : eventDate;
  return Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/** Menu / guest / venue edits allowed until this many days BEFORE the event. */
export function canEditBooking(eventDate: string | Date, status?: string): boolean {
  if (status === "cancelled" || status === "completed" || status === "menu_locked") return false;
  return daysUntilEvent(eventDate) >= CONFIG.editWindowDays;
}

export function editCutoffDate(eventDate: string | Date): Date {
  const d = typeof eventDate === "string" ? new Date(eventDate) : new Date(eventDate);
  d.setDate(d.getDate() - CONFIG.editWindowDays);
  d.setHours(23, 59, 59, 0);
  return d;
}

export function fmtShortDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export type JourneyStep = {
  id: string;
  title: string;
  detail: string;
  done: boolean;
  locked?: boolean;
  cta?: string;
};

export function buildBookingNextSteps(opts: {
  eventDate: string;
  status: string;
  balance: number;
  hasAddons: boolean;
}): JourneyStep[] {
  const days = daysUntilEvent(opts.eventDate);
  const editable = canEditBooking(opts.eventDate, opts.status);
  const cutoff = editCutoffDate(opts.eventDate);

  return [
    {
      id: "confirm",
      title: "Booking locked",
      detail: "Date reserved with advance. Our kitchen holds your slot.",
      done: opts.status === "confirmed" || opts.status === "menu_locked" || opts.status === "completed",
    },
    {
      id: "polish",
      title: "Polish your menu",
      detail: editable
        ? `Change dishes, add-ons & guests anytime until ${fmtShortDate(cutoff)} (${CONFIG.editWindowDays} days before the event).`
        : `Edit window closed. Call ${CONFIG.phoneDisplay} for kitchen-side changes.`,
      done: false,
      locked: !editable,
      cta: editable ? "Edit menu" : undefined,
    },
    {
      id: "extras",
      title: "Make the evening unforgettable",
      detail: opts.hasAddons
        ? "You already added extras — you can still swap or add more while editing is open."
        : "Live counters, mithai studio, thalis — guests remember these. Add while the window is open.",
      done: opts.hasAddons,
      locked: !editable,
      cta: editable && !opts.hasAddons ? "Browse extras" : undefined,
    },
    {
      id: "balance",
      title: "Clear the balance",
      detail: opts.balance > 0
        ? `Remaining amount is due before the event. Team will guide payment timelines.`
        : "Balance cleared — you are all set on payments.",
      done: opts.balance <= 0,
    },
    {
      id: "event",
      title: "Celebration day",
      detail: days >= 0
        ? `${days} day${days === 1 ? "" : "s"} to go. Venue access needed 12 hours before for buffet setup.`
        : "Event date has passed.",
      done: days < 0 || opts.status === "completed",
    },
  ];
}

/** Soft “tempt” copy for add-on categories — atelier-inspired, customer-facing. */
const TEMPT_BY_KEYWORD: { match: RegExp; hook: string; vibe: string }[] = [
  { match: /live|station|counter|theatre|theater/i, hook: "Crowd magnet", vibe: "Guests gather here first — the evening feels richer." },
  { match: /mithai|sweet|dessert|halwai/i, hook: "Sweet finale", vibe: "The last bite people talk about on the way home." },
  { match: /thali|regional|rajasthani|gujarati|bengali/i, hook: "Heritage moment", vibe: "A rooted table that feels personal, not generic." },
  { match: /non.?veg|mansahari|kebab|tandoor|chicken|mutton/i, hook: "For mixed tables", vibe: "Keep everyone happy without changing your veg core." },
  { match: /welcome|drink|mocktail|beverage/i, hook: "First impression", vibe: "Arrival energy sets the tone for the whole event." },
  { match: /chat|chaat|street/i, hook: "Interactive fun", vibe: "Kids and elders both light up at a chaat counter." },
];

export function temptForAddon(addon: Addon): { hook: string; vibe: string } {
  const hay = `${addon.category} ${addon.name} ${addon.description || ""}`;
  for (const t of TEMPT_BY_KEYWORD) {
    if (t.match.test(hay)) return { hook: t.hook, vibe: t.vibe };
  }
  return { hook: "Host favourite", vibe: "A small add that guests notice and remember." };
}

/** Pick a few high-impact add-ons to spotlight (not selected yet). */
export function pickInspireAddons(addons: Addon[], selectedIds: string[], limit = 4): Addon[] {
  const remaining = addons.filter((a) => !selectedIds.includes(a.id));
  const score = (a: Addon) => {
    const hay = `${a.category} ${a.name}`.toLowerCase();
    let s = 0;
    if (/live|station|counter/.test(hay)) s += 5;
    if (/mithai|sweet/.test(hay)) s += 4;
    if (/thali|regional/.test(hay)) s += 3;
    if (/chat|chaat/.test(hay)) s += 3;
    if (a.priceType === "per_event") s += 1;
    return s;
  };
  return [...remaining].sort((a, b) => score(b) - score(a)).slice(0, limit);
}

export function nextStepHint(step: string): { now: string; next: string } {
  switch (step) {
    case "menu":
      return { now: "Build your core menu course by course.", next: "Next: optional extras that elevate the evening." };
    case "addons":
      return { now: "Add moments guests will talk about — or skip.", next: "Next: request any personal dish not on the list." };
    case "custom":
      return { now: "Ask for a family favourite. Chef confirms pricing.", next: "Next: set your guest count." };
    case "guests":
      return { now: "Guests drive the total. You can still change later.", next: "Next: review everything in one place." };
    case "review":
      return { now: "Check incomplete courses and extras.", next: "Next: lock date, venue & city." };
    case "event":
      return { now: "Confirm logistics. Advance secures the date.", next: `After booking you can edit until ${CONFIG.editWindowDays} days before the event.` };
    default:
      return { now: "You are shaping your celebration.", next: "Follow the steps — we guide you each way." };
  }
}
