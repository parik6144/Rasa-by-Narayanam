"use client";
import { useEffect, useMemo, useState } from "react";
import { useApp, type BookingStep } from "@/store/app-store";
import { useCatalog } from "@/store/catalog-store";
import { CONFIG } from "@/lib/rasa-data";
import { parseSelection, isSectionComplete } from "@/lib/selection";
import {
  nextStepHint, pickInspireAddons, temptForAddon, fmtShortDate, editCutoffDate,
} from "@/lib/booking-journey";
import { packageImage } from "@/lib/site-images";
import { addonLineTotal, billableGuests, addonUsesGuestFloor, addonMinGuestsBadge, addonPricingNote } from "@/lib/addon-pricing";
import {
  ArrowLeft, ArrowRight, Check, Plus, Minus, Sparkles, Share2,
  Calendar, MapPin, Users, FileText, CheckCircle, AlertCircle, Info, Flame, Compass, Trash2, Pencil,
} from "lucide-react";
import PayBookingPanel from "@/components/rasa/pay-booking-panel";
import PromoCodeInput from "@/components/rasa/promo-code-input";

const STEP_META: { id: BookingStep; label: string; hint: string }[] = [
  { id: "menu", label: "1. Menu", hint: "Pick dishes for each course" },
  { id: "addons", label: "2. Extras", hint: "Make it unforgettable" },
  { id: "custom", label: "3. Custom", hint: "Add your own dishes" },
  { id: "guests", label: "4. Guests", hint: "How many people" },
  { id: "review", label: "5. Review", hint: "Check your menu" },
  { id: "event", label: "6. Event", hint: "Date & venue" },
];

export default function BookingWizard() {
  const {
    menuBuilderPkgId, bookingStep, bookingSectionIndex,
    setBookingStep, setBookingSectionIndex, closeBooking,
    activeQuotation, setActiveQuotation, user, setAuthModal, setToast, setView, resetQuotation,
    editingBookingId, editingBookingRef, editingPromo, clearEditingBooking,
  } = useApp();
  const { getPackage, getAddon, addons } = useCatalog();
  const isEditing = !!editingBookingId;

  const [customDishInput, setCustomDishInput] = useState("");
  const [customSection, setCustomSection] = useState("");
  const [addonCat, setAddonCat] = useState("");
  const [eventDate, setEventDate] = useState(activeQuotation.eventDate?.slice(0, 10) || "");
  const [venue, setVenue] = useState(activeQuotation.venue || "");
  const [city, setCity] = useState(activeQuotation.city || user?.city || "Jamshedpur");
  const [occasion, setOccasion] = useState(activeQuotation.occasion || "Wedding");
  const [notes, setNotes] = useState(activeQuotation.notes || "");
  const [bookingRef, setBookingRef] = useState<string | null>(editingBookingRef);
  const [bookingId, setBookingId] = useState<string | null>(editingBookingId);
  const [savedAsEdit, setSavedAsEdit] = useState(false);
  const [paidAdvance, setPaidAdvance] = useState(0);
  const [balanceDue, setBalanceDue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [skipWarn, setSkipWarn] = useState(false);
  const [promoCode, setPromoCode] = useState<string | null>(editingPromo?.code ?? null);
  const [promoDiscount, setPromoDiscount] = useState(editingPromo?.discountRupees ?? 0);
  const [promoFinalTotal, setPromoFinalTotal] = useState<number | null>(
    editingPromo?.code && editingPromo.totalRupees > 0 ? editingPromo.totalRupees : null
  );

  // When opening an existing booking to edit, restore its applied offer into the wizard
  useEffect(() => {
    if (!editingBookingId) return;
    setBookingId(editingBookingId);
    setBookingRef(editingBookingRef);
    if (editingPromo?.code) {
      setPromoCode(editingPromo.code);
      setPromoDiscount(editingPromo.discountRupees || 0);
      setPromoFinalTotal(editingPromo.totalRupees > 0 ? editingPromo.totalRupees : null);
    } else {
      setPromoCode(null);
      setPromoDiscount(0);
      setPromoFinalTotal(null);
    }
  }, [
    editingBookingId,
    editingBookingRef,
    editingPromo?.code,
    editingPromo?.discountRupees,
    editingPromo?.totalRupees,
  ]);

  const pkg = menuBuilderPkgId ? getPackage(menuBuilderPkgId) : undefined;
  const addonCategories = useMemo(() => Array.from(new Set(addons.map((a) => a.category))), [addons]);
  const activeAddonCat = addonCategories.includes(addonCat) ? addonCat : addonCategories[0] || "";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [bookingStep, bookingSectionIndex]);

  useEffect(() => {
    if (pkg && !customSection) setCustomSection(pkg.sections[0]?.section || "Other");
  }, [pkg, customSection]);

  // Keep discount in sync when guests/extras change while a promo is applied
  useEffect(() => {
    if (!promoCode || !pkg) return;
    const guests = activeQuotation.guests;
    const pkgTotal = pkg.price * guests;
    const addonsTotal = activeQuotation.selectedAddons.reduce((sum, id) => {
      const a = getAddon(id);
      if (!a) return sum;
      return sum + addonLineTotal(a, guests);
    }, 0);
    const gross = pkgTotal + addonsTotal + Math.round((pkgTotal + addonsTotal) * 0.05);
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/promos/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: promoCode, totalRupees: gross }),
        });
        const d = await r.json();
        if (cancelled || !r.ok) return;
        setPromoDiscount(d.discountRupees || 0);
        setPromoFinalTotal(d.totalRupees ?? null);
      } catch {
        /* keep hydrated values */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    promoCode,
    pkg,
    activeQuotation.guests,
    activeQuotation.selectedAddons,
    getAddon,
  ]);

  if (!menuBuilderPkgId || !pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "linear-gradient(180deg,#1a0f19,#221421)" }}>
        <div className="text-center">
          <p className="mb-4" style={{ color: "rgba(246,239,224,.72)" }}>Package not found.</p>
          <button onClick={closeBooking} className="glossy-btn-gold px-5 py-2 rounded-md font-semibold">Back to packages</button>
        </div>
      </div>
    );
  }

  const selected = activeQuotation.selectedDishes;
  const selectedAddons = activeQuotation.selectedAddons;
  const customDishes = activeQuotation.customDishes || [];
  const sections = pkg.sections;
  const current = sections[bookingSectionIndex];
  const inspire = pickInspireAddons(addons, selectedAddons, 4);
  const guide = nextStepHint(bookingStep);

  const requiredSections = sections.filter((s) => {
    const max = parseSelection(s.selection);
    return max !== 0 && max !== 999;
  });
  const incompleteSections = requiredSections.filter(
    (s) => !isSectionComplete(s.selection, (selected[s.section] || []).length, s.dishes.length)
  );
  const completedCount = requiredSections.length - incompleteSections.length;
  const completionPct = requiredSections.length
    ? Math.round((completedCount / requiredSections.length) * 100)
    : 100;

  const calcTotal = () => {
    const pkgTotal = pkg.price * activeQuotation.guests;
    const addonsTotal = selectedAddons.reduce((sum, id) => {
      const a = getAddon(id);
      if (!a) return sum;
      return sum + addonLineTotal(a, activeQuotation.guests);
    }, 0);
    const subtotal = pkgTotal + addonsTotal;
    const gst = Math.round(subtotal * 0.05);
    return { pkgTotal, addonsTotal, subtotal, gst, total: subtotal + gst };
  };
  const { pkgTotal, addonsTotal, subtotal, total } = calcTotal();
  // Clear bill for guests: menu → offer → GST ₹ amount → total (never hide GST as "included")
  const afterOffer = Math.max(0, subtotal - (promoDiscount || 0));
  const payableGst = Math.round(afterOffer * (CONFIG.gstPercent / 100));
  const payableTotal = afterOffer + payableGst;
  const advance = Math.round(payableTotal * (CONFIG.advancePercent / 100));

  const toggleDish = (section: string, dish: string, max: number) => {
    const cur = selected[section] || [];
    let next: string[];
    if (cur.includes(dish)) next = cur.filter((d) => d !== dish);
    else if (cur.length >= max) next = [...cur.slice(1), dish];
    else next = [...cur, dish];
    setActiveQuotation({ selectedDishes: { ...selected, [section]: next } });
    setSkipWarn(false);
  };

  const toggleAddon = (id: string) => {
    setActiveQuotation({
      selectedAddons: selectedAddons.includes(id)
        ? selectedAddons.filter((a) => a !== id)
        : [...selectedAddons, id],
    });
  };

  const currentComplete = current
    ? isSectionComplete(current.selection, (selected[current.section] || []).length, current.dishes.length)
    : true;

  const goNextCourse = () => {
    if (!currentComplete && parseSelection(current.selection) > 0 && parseSelection(current.selection) < 999) {
      setSkipWarn(true);
      return;
    }
    setSkipWarn(false);
    if (bookingSectionIndex < sections.length - 1) {
      setBookingSectionIndex(bookingSectionIndex + 1);
    } else {
      setBookingStep("addons");
      setToast("Menu courses done — review optional add-ons, or skip.");
    }
  };

  const forceSkipCourse = () => {
    setSkipWarn(false);
    if (bookingSectionIndex < sections.length - 1) {
      setBookingSectionIndex(bookingSectionIndex + 1);
    } else {
      setBookingStep("addons");
    }
  };

  const goToStep = (step: BookingStep) => {
    if (step === "review" || step === "event" || step === "success") {
      if (incompleteSections.length > 0 && step !== "menu") {
        // allow but warn on review
      }
    }
    setBookingStep(step);
    if (step === "menu") setSkipWarn(false);
  };

  const proceedFromReview = () => {
    if (incompleteSections.length > 0) {
      setToast(`Please complete these courses first: ${incompleteSections.map((s) => s.section).join(", ")}`);
      setBookingStep("menu");
      const idx = sections.findIndex((s) => s.section === incompleteSections[0].section);
      if (idx >= 0) setBookingSectionIndex(idx);
      return;
    }
    if (!user) {
      setAuthModal("login");
      setToast("Please log in to complete your booking");
      return;
    }
    setBookingStep("event");
  };

  const confirmBooking = async (_advancePaidNow = 0) => {
    if (!eventDate || !venue || !city) {
      setErr("Event date, venue and city are required");
      return;
    }
    if (!user) {
      setAuthModal("login");
      return;
    }
    setLoading(true);
    setErr(null);
    const addonsSnapshot = selectedAddons.map((id) => {
      const a = getAddon(id);
      return {
        id,
        name: a?.name,
        price: a?.price,
        priceType: a?.priceType,
        guestRange: a?.guestRange || 0,
        choice: activeQuotation.addonChoices[id] || null,
      };
    });
    try {
      if (isEditing && editingBookingId) {
        const res = await fetch("/api/bookings/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            bookingId: editingBookingId,
            eventDate, venue, city,
            guests: activeQuotation.guests,
            total, // gross before promo — server applies promoCode
            menuSnapshot: activeQuotation.selectedDishes,
            addonsSnapshot,
            customDishes,
            occasion,
            notes,
            promoCode: promoCode || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Update failed");
        setBookingRef(data.booking.bookingRef || editingBookingRef);
        setBookingId(data.booking.id);
        setPaidAdvance(Math.round((data.booking.advancePaid || 0) / 100));
        setBalanceDue(Math.round((data.booking.balance || data.booking.total || 0) / 100));
        setSavedAsEdit(true);
        setBookingStep("success");
        setToast("Booking updated — you can pay any remaining balance below");
        clearEditingBooking();
      } else {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            packageId: pkg.id,
            eventDate, venue, city,
            guests: activeQuotation.guests,
            total, // gross before promo — server applies promoCode
            advancePaid: 0,
            menuSnapshot: activeQuotation.selectedDishes,
            addonsSnapshot,
            customDishes,
            occasion,
            notes,
            promoCode: promoCode || undefined,
          }),
        });
        const raw = await res.text();
        let data: {
          error?: string;
          booking?: {
            bookingRef: string;
            id: string;
            balance?: number;
            total?: number;
            advancePaid?: number;
          };
        } = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          throw new Error(raw?.slice(0, 180) || `Booking failed (HTTP ${res.status})`);
        }
        if (!res.ok) throw new Error(data.error || `Booking failed (HTTP ${res.status})`);
        if (!data.booking?.bookingRef) throw new Error("Booking saved but no reference returned");
        setPaidAdvance(Math.round((data.booking.advancePaid || 0) / 100));
        setBalanceDue(Math.round((data.booking.balance || data.booking.total || 0) / 100));
        setBookingRef(data.booking.bookingRef);
        setBookingId(data.booking.id);
        setBookingStep("success");
        setToast("Booking confirmed — pay now or later");
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  const helpForCourse = () => {
    if (!current) return "";
    const max = parseSelection(current.selection);
    const cur = (selected[current.section] || []).length;
    if (max === 999) return "All of these items are included in your package — continue when ready.";
    if (max === 0) return "Complimentary course — already included. Continue when ready.";
    if (cur === 0) return `Select ${max === 1 ? "1 dish" : `${max} dishes`} for ${current.section}. Tap a name to choose.`;
    if (cur < Math.min(max, current.dishes.length)) return `${cur} selected — pick ${Math.min(max, current.dishes.length) - cur} more.`;
    return "This course is complete. Go to the next course.";
  };

  const stepIndex = STEP_META.findIndex((s) => s.id === bookingStep);

  const pkgHero = packageImage(pkg.id);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg,#F6EFE0 0%,#EEE3CF 40%,#E8DCC4 100%)", color: "#2c1a26" }}>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b" style={{ background: "linear-gradient(180deg,#2f1e2f,#221421)", borderColor: "rgba(198,152,58,.25)" }}>
        <div className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img src={pkgHero} alt="" className="w-full h-full object-cover opacity-40" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(34,20,33,.55), rgba(34,20,33,.92))" }} />
          </div>
          <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <button onClick={() => { if (isEditing) { clearEditingBooking(); setView("user-dashboard"); } else closeBooking(); }} className="flex items-center gap-2 text-sm font-medium" style={{ color: "rgba(246,239,224,.72)" }}>
              <ArrowLeft className="w-4 h-4" /> {isEditing ? "My bookings" : "Packages"}
            </button>
            <div className="text-center flex-1 min-w-0">
              <div className="font-display text-[1.15rem] sm:text-[1.35rem] truncate" style={{ color: "var(--ivory)" }}>{pkg.name}</div>
              <div className="text-[0.72rem]" style={{ color: "var(--gold-bright)" }}>
                {isEditing ? `Editing ${editingBookingRef || "booking"} · ₹${pkg.price}/guest` : `₹${pkg.price}/guest · Shape your celebration`}
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-[0.66rem] uppercase tracking-wider" style={{ color: "rgba(246,239,224,.5)" }}>Estimate</div>
              <div className="font-display text-[1.2rem]" style={{ color: "var(--gold-bright)" }}>₹{total.toLocaleString("en-IN")}</div>
            </div>
          </div>
        </div>

        {/* Stepper */}
        {bookingStep !== "success" && (
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 pb-4 overflow-x-auto">
            <div className="flex gap-1 sm:gap-2 min-w-max">
              {STEP_META.map((s, i) => {
                const done = stepIndex > i;
                const active = s.id === bookingStep;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      // allow going back freely; forward only if menu courses mostly done for late steps
                      if (i <= stepIndex || s.id === "menu" || s.id === "addons" || s.id === "custom" || s.id === "guests") {
                        goToStep(s.id);
                        if (s.id === "menu") setBookingSectionIndex(0);
                      }
                    }}
                    className="flex-1 min-w-[100px] rounded-md px-2 py-2 text-left transition-all"
                    style={{
                      background: active ? "rgba(198,152,58,.25)" : done ? "rgba(31,122,92,.15)" : "rgba(246,239,224,.04)",
                      border: `1px solid ${active ? "var(--gold)" : "transparent"}`,
                    }}
                  >
                    <div className="text-[0.68rem] font-bold tracking-wide" style={{ color: active ? "var(--gold-bright)" : done ? "#7dba9a" : "rgba(246,239,224,.45)" }}>
                      {done ? "✓ " : ""}{s.label}
                    </div>
                    <div className="text-[0.62rem] hidden sm:block truncate" style={{ color: "rgba(246,239,224,.45)" }}>{s.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {bookingStep !== "success" && (
        <div className="border-b" style={{ background: "rgba(47,30,47,.04)", borderColor: "rgba(58,39,51,.1)" }}>
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm">
            <div className="flex items-start gap-2 flex-1">
              <Compass className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--anaar)" }} />
              <div><span className="font-semibold">Now: </span>{guide.now}</div>
            </div>
            <div className="text-[0.85rem] sm:text-right" style={{ color: "var(--on-ivory-dim)" }}>
              <span className="font-semibold" style={{ color: "var(--gold)" }}>Next → </span>{guide.next}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* ===== MENU ===== */}
        {bookingStep === "menu" && current && (
          <div>
            <div className="rounded-xl p-4 sm:p-5 mb-6" style={{ background: "rgba(47,30,47,.06)", border: "1px solid rgba(58,39,51,.12)" }}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-[0.7rem] tracking-[0.16em] uppercase font-bold" style={{ color: "var(--on-ivory-dim)" }}>
                    Course {bookingSectionIndex + 1} of {sections.length}
                  </div>
                  <h1 className="font-display text-[2rem] sm:text-[2.4rem]" style={{ color: "#2c1a26" }}>{current.section}</h1>
                </div>
                <span className="text-[0.75rem] tracking-[0.12em] uppercase font-bold px-3 py-1.5 rounded-full" style={{ color: "var(--anaar)", background: "rgba(156,42,56,.1)" }}>
                  {current.selection} · {(selected[current.section] || []).length}/{Math.min(parseSelection(current.selection) || current.dishes.length, current.dishes.length)}
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden mb-3" style={{ background: "rgba(58,39,51,.1)" }}>
                <div className="h-full transition-all" style={{ width: `${completionPct}%`, background: completionPct === 100 ? "#1f7a5c" : "linear-gradient(90deg,#C6983A,#E2B658)" }} />
              </div>
              <div className="flex items-start gap-2 text-[0.9rem]" style={{ color: "var(--on-ivory-dim)" }}>
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--gold)" }} />
                <span>{helpForCourse()}</span>
              </div>
            </div>

            {/* Course nav chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {sections.map((s, i) => {
                const done = isSectionComplete(s.selection, (selected[s.section] || []).length, s.dishes.length);
                const active = i === bookingSectionIndex;
                return (
                  <button
                    key={`course-chip-${i}`}
                    onClick={() => { setBookingSectionIndex(i); setSkipWarn(false); }}
                    className="px-3 py-1.5 rounded-full text-[0.75rem] font-medium"
                    style={{
                      background: active ? "var(--gold)" : done ? "rgba(31,122,92,.12)" : "#fff",
                      color: active ? "#231318" : done ? "#1f7a5c" : "var(--on-ivory-dim)",
                      border: `1px solid ${active ? "var(--gold)" : "rgba(58,39,51,.15)"}`,
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {done ? "✓ " : ""}{i + 1}. {s.section}
                  </button>
                );
              })}
            </div>

            {parseSelection(current.selection) === 999 || parseSelection(current.selection) === 0 ? (
              <div className="rounded-xl p-5 mb-6" style={{ background: "rgba(31,122,92,.08)", border: "1px solid rgba(31,122,92,.2)" }}>
                <p className="mb-3 font-medium">{parseSelection(current.selection) === 0 ? "Complimentary — already included." : "All of these are served with your package."}</p>
                <ul className="grid sm:grid-cols-2 gap-2">
                    {current.dishes.map((d, di) => (
                      <li key={`${current.section}-inc-${di}`} className="flex items-center gap-2 text-[0.95rem]"><Check className="w-4 h-4" style={{ color: "#1f7a5c" }} />{d}</li>
                    ))}
                </ul>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-6">
                  {current.dishes.map((dish, di) => {
                    const cur = selected[current.section] || [];
                    const isSel = cur.includes(dish);
                    const max = parseSelection(current.selection);
                    return (
                      <button
                        key={`${current.section}-dish-${di}`}
                        onClick={() => toggleDish(current.section, dish, max)}
                        className="flex gap-3 items-center p-3.5 rounded-lg text-left transition-all"
                      style={{
                        background: isSel ? "rgba(198,152,58,.18)" : "#fff",
                        border: `1.5px solid ${isSel ? "var(--gold)" : "rgba(58,39,51,.12)"}`,
                        fontWeight: isSel ? 600 : 400,
                      }}
                    >
                      <span className="w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0" style={isSel ? { background: "var(--gold)", borderColor: "var(--gold)" } : { borderColor: "rgba(58,39,51,.3)", background: "#fff" }}>
                        {isSel && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                      </span>
                      <span className="text-[0.95rem]">{dish}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {skipWarn && (
              <div className="rounded-lg p-4 mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between" style={{ background: "rgba(156,42,56,.08)", border: "1px solid rgba(156,42,56,.25)" }}>
                <div className="flex gap-2 items-start">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "var(--anaar)" }} />
                  <div>
                    <div className="font-semibold text-sm">This course selection is still incomplete</div>
                    <div className="text-sm" style={{ color: "var(--on-ivory-dim)" }}>{helpForCourse()} You can come back later from the course chips.</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSkipWarn(false)} className="px-3 py-2 rounded-md text-sm font-semibold" style={{ background: "var(--gold)", color: "#231318" }}>Keep selecting</button>
                  <button onClick={forceSkipCourse} className="px-3 py-2 rounded-md text-sm font-semibold" style={{ border: "1px solid rgba(58,39,51,.25)" }}>Skip anyway</button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4">
              <button
                onClick={() => bookingSectionIndex > 0 && setBookingSectionIndex(bookingSectionIndex - 1)}
                disabled={bookingSectionIndex === 0}
                className="flex-1 py-3.5 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: "#fff", border: "1px solid rgba(58,39,51,.2)" }}
              >
                <ArrowLeft className="w-4 h-4" /> Previous course
              </button>
              <button
                onClick={goNextCourse}
                className="flex-[1.5] py-3.5 rounded-lg font-semibold flex items-center justify-center gap-2"
                style={{ background: currentComplete ? "var(--gold)" : "rgba(198,152,58,.45)", color: "#231318" }}
              >
                {bookingSectionIndex < sections.length - 1 ? "Next course" : "Continue to Add-ons"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ===== ADDONS ===== */}
        {bookingStep === "addons" && (
          <div>
            <h1 className="font-display text-[2rem] sm:text-[2.4rem] mb-2">Make it unforgettable</h1>
            <p className="text-[1rem] mb-2" style={{ color: "var(--on-ivory-dim)" }}>
              Your package is the foundation. These extras are what guests photograph and remember — add what fits your evening, or skip.
            </p>
            <div className="rounded-lg p-3.5 mb-5 text-sm flex items-start gap-2.5" style={{ background: "rgba(198,152,58,.12)", border: "1px solid rgba(198,152,58,.35)" }}>
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--gold)" }} />
              <div>
                <div className="font-semibold mb-1" style={{ color: "#2c1a26" }}>
                  Notice: per-guest add-ons have a minimum charge
                </div>
                <p style={{ color: "var(--on-ivory-dim)" }}>
                  You currently have <b>{activeQuotation.guests.toLocaleString("en-IN")} guests</b>.
                  {" "}If an extra says <b>Min 500 guests</b> (or another minimum), you still pay for that many —
                  e.g. 100 guests → charged as <b>500 × rate</b>. Above the minimum, you pay for actual guests.
                  {" "}Package price always uses your real count only. Selected: <b>{selectedAddons.length}</b> extra(s).
                </p>
              </div>
            </div>

            {inspire.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="w-4 h-4" style={{ color: "var(--anaar)" }} />
                  <h2 className="font-display text-[1.25rem]">Hosts often add these</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {inspire.map((a) => {
                    const t = temptForAddon(a);
                    const priceStr = a.priceType === "per_guest" ? `₹${a.price}/guest` : `₹${a.price}`;
                    const isSel = selectedAddons.includes(a.id);
                    const badge = addonMinGuestsBadge(a);
                    const note = isSel ? addonPricingNote(a, activeQuotation.guests) : addonPricingNote(a);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAddon(a.id)}
                        className="text-left p-4 rounded-xl transition-all"
                        style={{
                          background: isSel ? "rgba(198,152,58,.18)" : "#fff",
                          border: `1.5px solid ${isSel ? "var(--gold)" : "rgba(58,39,51,.12)"}`,
                          boxShadow: "0 8px 24px rgba(47,30,47,.06)",
                        }}
                      >
                        <div className="text-[0.65rem] font-bold uppercase tracking-[0.16em] mb-1" style={{ color: "var(--anaar)" }}>{t.hook}</div>
                        <div className="flex justify-between gap-2">
                          <span className="font-display text-[1.15rem]">{a.name}</span>
                          <span className="font-semibold whitespace-nowrap text-right" style={{ color: "var(--anaar)" }}>
                            {priceStr}
                            {badge && <span className="block text-[0.65rem] font-medium opacity-80">{badge}</span>}
                          </span>
                        </div>
                        <p className="text-sm mt-1" style={{ color: "var(--on-ivory-dim)" }}>{t.vibe}</p>
                        {note && <p className="text-[0.72rem] mt-1.5" style={{ color: "var(--gold)" }}>{note}</p>}
                        <div className="mt-2 text-xs font-semibold" style={{ color: isSel ? "var(--gold)" : "var(--on-ivory-dim)" }}>
                          {isSel ? "✓ Added to your evening" : "+ Add to my event"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-5">
              {addonCategories.map((c) => (
                <button
                  key={c}
                  onClick={() => setAddonCat(c)}
                  className="px-3 py-1.5 rounded-full text-[0.75rem] font-medium"
                  style={activeAddonCat === c ? { background: "var(--gold)", color: "#231318", fontWeight: 600 } : { background: "#fff", border: "1px solid rgba(58,39,51,.15)", color: "var(--on-ivory-dim)" }}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="space-y-2 mb-8">
              {addons.filter((a) => a.category === activeAddonCat).map((a) => {
                const isSel = selectedAddons.includes(a.id);
                const priceStr = a.priceType === "per_guest" ? `₹${a.price}/guest` : `₹${a.price}`;
                const t = temptForAddon(a);
                const badge = addonMinGuestsBadge(a);
                const note = isSel ? addonPricingNote(a, activeQuotation.guests) : addonPricingNote(a);
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleAddon(a.id)}
                    className="w-full text-left p-4 rounded-lg flex gap-3 items-start"
                    style={{ background: isSel ? "rgba(198,152,58,.15)" : "#fff", border: `1.5px solid ${isSel ? "var(--gold)" : "rgba(58,39,51,.12)"}` }}
                  >
                    <span className="w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5" style={isSel ? { background: "var(--gold)", borderColor: "var(--gold)" } : { borderColor: "rgba(58,39,51,.3)" }}>
                      {isSel && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between gap-3">
                        <span className="font-display text-[1.1rem]">{a.name}{a.nv ? " · NV" : ""}</span>
                        <span className="font-semibold whitespace-nowrap text-right" style={{ color: "var(--anaar)" }}>
                          {priceStr}
                          {badge && <span className="block text-[0.65rem] font-medium opacity-80">{badge}</span>}
                        </span>
                      </div>
                      <div className="text-[0.7rem] font-semibold mt-0.5" style={{ color: "var(--gold)" }}>{t.hook}</div>
                      {a.description && <div className="text-sm mt-1" style={{ color: "var(--on-ivory-dim)" }}>{a.description}</div>}
                      {note && <div className="text-[0.72rem] mt-1.5" style={{ color: "var(--gold)" }}>{note}</div>}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setBookingStep("menu")} className="flex-1 py-3.5 rounded-lg font-semibold flex items-center justify-center gap-2" style={{ background: "#fff", border: "1px solid rgba(58,39,51,.2)" }}>
                <ArrowLeft className="w-4 h-4" /> Back to menu
              </button>
              <button onClick={() => setBookingStep("custom")} className="flex-[1.5] py-3.5 rounded-lg font-semibold flex items-center justify-center gap-2" style={{ background: "var(--gold)", color: "#231318" }}>
                {selectedAddons.length ? "Next: Custom dishes" : "Skip extras → Custom"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ===== CUSTOM ===== */}
        {bookingStep === "custom" && (
          <div>
            <h1 className="font-display text-[2rem] sm:text-[2.4rem] mb-2 flex items-center gap-2"><Sparkles className="w-7 h-7" style={{ color: "var(--gold)" }} /> Custom dishes</h1>
            <p className="text-[1rem] mb-6" style={{ color: "var(--on-ivory-dim)" }}>
              Dish not on the list? Add a request here. The chef will confirm — pricing is separate. This step is optional.
            </p>

            <div className="rounded-xl p-5 mb-6 space-y-3" style={{ background: "#fff", border: "1px solid rgba(58,39,51,.12)" }}>
              <select value={customSection} onChange={(e) => setCustomSection(e.target.value)} className="w-full rounded-md px-3 py-3" style={{ border: "1px solid rgba(58,39,51,.2)" }}>
                {sections.map((s) => <option key={s.section}>{s.section}</option>)}
                <option>Other</option>
              </select>
              <div className="flex gap-2">
                <input
                  value={customDishInput}
                  onChange={(e) => setCustomDishInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customDishInput.trim()) {
                      setActiveQuotation({ customDishes: [...customDishes, `${customSection}: ${customDishInput.trim()}`] });
                      setCustomDishInput("");
                    }
                  }}
                  placeholder="e.g. Hyderabadi Dum Biryani…"
                  className="flex-1 rounded-md px-3 py-3"
                  style={{ border: "1px solid rgba(58,39,51,.2)" }}
                />
                <button
                  onClick={() => {
                    if (!customDishInput.trim()) return;
                    setActiveQuotation({ customDishes: [...customDishes, `${customSection}: ${customDishInput.trim()}`] });
                    setCustomDishInput("");
                  }}
                  className="glossy-btn-gold px-4 rounded-md font-semibold flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>

            {customDishes.length > 0 ? (
              <div className="space-y-2 mb-8">
                {customDishes.map((d, i) => (
                  <div key={i} className="flex justify-between p-3 rounded-lg" style={{ background: "#fff", border: "1px solid rgba(58,39,51,.12)" }}>
                    <span>{d}</span>
                    <button onClick={() => setActiveQuotation({ customDishes: customDishes.filter((_, j) => j !== i) })} className="text-sm font-semibold" style={{ color: "var(--anaar)" }}>Remove</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 mb-6 rounded-xl" style={{ background: "rgba(58,39,51,.04)" }}>No custom dishes — you can skip this step.</div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setBookingStep("addons")} className="flex-1 py-3.5 rounded-lg font-semibold flex items-center justify-center gap-2" style={{ background: "#fff", border: "1px solid rgba(58,39,51,.2)" }}>
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={() => setBookingStep("guests")} className="flex-[1.5] py-3.5 rounded-lg font-semibold flex items-center justify-center gap-2" style={{ background: "var(--gold)", color: "#231318" }}>
                Next: Guest count <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ===== GUESTS ===== */}
        {bookingStep === "guests" && (
          <div className="max-w-xl mx-auto text-center">
            <h1 className="font-display text-[2rem] sm:text-[2.4rem] mb-2">How many guests?</h1>
            <p className="mb-8" style={{ color: "var(--on-ivory-dim)" }}>
              Minimum {CONFIG.minGuests} guests. Total is package price × guests. You can still change this on the review step.
            </p>
            <div className="flex items-center justify-center gap-4 mb-6">
              <button onClick={() => setActiveQuotation({ guests: Math.max(CONFIG.minGuests, activeQuotation.guests - 10) })} className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: "#fff", border: "1px solid rgba(58,39,51,.2)" }}>
                <Minus className="w-5 h-5" />
              </button>
              <input
                type="number"
                min={CONFIG.minGuests}
                value={activeQuotation.guests}
                onChange={(e) => setActiveQuotation({ guests: Math.max(CONFIG.minGuests, parseInt(e.target.value) || CONFIG.minGuests) })}
                className="w-36 text-center font-display text-[2.5rem] py-2 rounded-xl"
                style={{ border: "2px solid var(--gold)", background: "#fff" }}
              />
              <button onClick={() => setActiveQuotation({ guests: activeQuotation.guests + 10 })} className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#fff", border: "1px solid rgba(58,39,51,.2)" }}>
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-xl p-5 mb-4 text-left" style={{ background: "#fff", border: "1px solid rgba(58,39,51,.12)" }}>
              <div className="flex justify-between py-1"><span>Package</span><span>₹{pkgTotal.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between py-1"><span>Add-ons</span><span>₹{addonsTotal.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between py-1 text-sm" style={{ color: "var(--on-ivory-dim)" }}>
                <span>Menu subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              {promoDiscount > 0 && (
                <>
                  <div className="flex justify-between py-1" style={{ color: "#1f7a5c" }}>
                    <span>Offer {promoCode}</span>
                    <span>−₹{promoDiscount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm" style={{ color: "var(--on-ivory-dim)" }}>
                    <span>After offer</span><span>₹{afterOffer.toLocaleString("en-IN")}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-1">
                <span>GST {CONFIG.gstPercent}%</span>
                <span>₹{payableGst.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between font-display text-[1.4rem] pt-3 mt-2 border-t" style={{ borderColor: "rgba(58,39,51,.15)" }}>
                <span>Total payable</span><span style={{ color: "var(--anaar)" }}>₹{payableTotal.toLocaleString("en-IN")}</span>
              </div>
              <p className="text-[0.72rem] mt-2" style={{ color: "var(--on-ivory-dim)" }}>
                {promoDiscount > 0
                  ? "Offer first on menu total, then GST is added."
                  : "GST is added on the menu total."}
              </p>
            </div>
            <div
              className="rounded-xl p-4 mb-8 text-left"
              style={{
                background: "linear-gradient(135deg,rgba(198,152,58,.18),#fff)",
                border: "2px solid rgba(198,152,58,.55)",
              }}
            >
              <div className="font-display text-[1.2rem] mb-1" style={{ color: "#2c1a26" }}>
                Offer / promo code
              </div>
              <p className="text-sm mb-3" style={{ color: "var(--on-ivory-dim)" }}>
                Try <b>RASA10</b> or <b>FLAT5K</b>
              </p>
              <PromoCodeInput
                theme="light"
                totalRupees={total}
                appliedCode={promoCode}
                appliedDiscountRupees={promoDiscount || undefined}
                onToast={setToast}
                onApplied={(info) => {
                  if (!info) {
                    setPromoCode(null);
                    setPromoDiscount(0);
                    setPromoFinalTotal(null);
                    return;
                  }
                  setPromoCode(info.code);
                  setPromoDiscount(info.discountRupees);
                  setPromoFinalTotal(info.totalRupees);
                }}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setBookingStep("custom")} className="flex-1 py-3.5 rounded-lg font-semibold" style={{ background: "#fff", border: "1px solid rgba(58,39,51,.2)" }}>Back</button>
              <button
                onClick={() => {
                  if (incompleteSections.length > 0) {
                    setToast(`${incompleteSections.length} course(s) incomplete — they will show on review`);
                  }
                  setBookingStep("review");
                }}
                className="flex-[1.5] py-3.5 rounded-lg font-semibold flex items-center justify-center gap-2"
                style={{ background: "var(--gold)", color: "#231318" }}
              >
                Review menu <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ===== REVIEW ===== */}
        {bookingStep === "review" && (
          <div>
            <h1 className="font-display text-[2rem] sm:text-[2.4rem] mb-2">Review your menu</h1>
            <p className="mb-6" style={{ color: "var(--on-ivory-dim)" }}>Review everything below. Incomplete courses are highlighted in red — tap them to finish selecting.</p>

            {selectedAddons.length === 0 && (
              <div className="rounded-lg p-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ background: "rgba(156,42,56,.06)", border: "1px solid rgba(156,42,56,.2)" }}>
                <div className="flex items-start gap-2 text-sm">
                  <Flame className="w-4 h-4 mt-0.5" style={{ color: "var(--anaar)" }} />
                  <div>
                    <div className="font-semibold">No extras yet — want the evening to feel fuller?</div>
                    <div style={{ color: "var(--on-ivory-dim)" }}>Live counters and mithai studios are what guests remember. You can add now or edit later until the cutoff.</div>
                  </div>
                </div>
                <button type="button" onClick={() => setBookingStep("addons")} className="px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap" style={{ background: "var(--gold)", color: "#231318" }}>
                  Browse extras
                </button>
              </div>
            )}

            {incompleteSections.length > 0 && (
              <div className="rounded-lg p-4 mb-5" style={{ background: "rgba(156,42,56,.08)", border: "1px solid rgba(156,42,56,.25)" }}>
                <div className="font-semibold mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" style={{ color: "var(--anaar)" }} /> Incomplete courses — finish these before booking</div>
                <div className="flex flex-wrap gap-2">
                  {incompleteSections.map((s) => {
                    const idx = sections.findIndex((x) => x.section === s.section);
                    return (
                      <button
                        key={`fix-${idx}-${s.section}`}
                        onClick={() => { setBookingStep("menu"); setBookingSectionIndex(idx); }}
                        className="px-3 py-1.5 rounded-full text-sm font-semibold"
                        style={{ background: "var(--anaar)", color: "#fff" }}
                      >
                        Fix: {s.section}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-xl p-5 mb-4" style={{ background: "#fff", border: "1px solid rgba(58,39,51,.12)" }}>
              <div className="font-display text-[1.3rem] mb-3">{pkg.name} · ₹{pkg.price} × {activeQuotation.guests} guests</div>
              {sections.map((s, si) => {
                const sel = selected[s.section] || [];
                const ok = isSectionComplete(s.selection, sel.length, s.dishes.length);
                const max = parseSelection(s.selection);
                const auto = max === 0 || max === 999;
                return (
                  <div key={`review-sec-${si}`} className="py-3 border-t" style={{ borderColor: "rgba(58,39,51,.1)" }}>
                    <div className="flex justify-between items-baseline gap-2 mb-1">
                      <span className="font-semibold">{s.section}</span>
                      <button
                        onClick={() => {
                          const idx = sections.findIndex((x) => x.section === s.section);
                          setBookingStep("menu");
                          setBookingSectionIndex(idx);
                        }}
                        className="text-xs font-semibold"
                        style={{ color: ok ? "var(--gold)" : "var(--anaar)" }}
                      >
                        {ok ? "Edit" : "Complete →"}
                      </button>
                    </div>
                    <div className="text-sm" style={{ color: ok ? "var(--on-ivory-dim)" : "var(--anaar)" }}>
                      {auto ? (s.dishes.join(", ") || "Included") : sel.length ? sel.join(", ") : "⚠️ Nothing selected"}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedAddons.length > 0 && (
              <div
                className="rounded-xl p-5 sm:p-6 mb-4 relative overflow-hidden"
                style={{
                  background: "linear-gradient(165deg, #2a1a28 0%, #1a0f19 55%, #231318 100%)",
                  border: "1px solid rgba(226,182,88,.35)",
                  boxShadow: "0 18px 40px -18px rgba(47,30,47,.45)",
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-40"
                  style={{
                    background:
                      "radial-gradient(ellipse at top right, rgba(198,152,58,.18), transparent 55%), radial-gradient(ellipse at bottom left, rgba(156,42,56,.12), transparent 50%)",
                  }}
                />
                <div className="relative flex flex-wrap items-end justify-between gap-3 mb-5 pb-4" style={{ borderBottom: "1px solid rgba(226,182,88,.22)" }}>
                  <div className="min-w-0 flex-1">
                    <div className="text-[0.68rem] font-semibold tracking-[0.28em] uppercase mb-1" style={{ color: "var(--gold-bright)" }}>
                      Curated extras
                    </div>
                    <div className="font-display text-[1.45rem]" style={{ color: "var(--ivory)" }}>
                      Add-ons
                    </div>
                    <p className="text-[0.82rem] mt-1" style={{ color: "rgba(246,239,224,.62)" }}>
                      {selectedAddons.length} selected for this evening
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setBookingStep("addons")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.75rem] font-semibold transition-opacity hover:opacity-90"
                      style={{ background: "rgba(198,152,58,.18)", border: "1px solid rgba(226,182,88,.45)", color: "var(--gold-bright)" }}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit selection
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingStep("addons")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.75rem] font-semibold"
                      style={{ background: "var(--gold)", color: "#231318" }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add more
                    </button>
                  </div>
                </div>

                <div
                  className="relative mb-4 rounded-lg p-3.5 flex gap-2.5 items-start"
                  style={{
                    background: "rgba(198,152,58,.14)",
                    border: "1px solid rgba(226,182,88,.4)",
                  }}
                >
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--gold-bright)" }} />
                  <div className="text-[0.84rem] leading-relaxed" style={{ color: "rgba(246,239,224,.88)" }}>
                    <div className="font-semibold mb-1" style={{ color: "var(--gold-bright)" }}>
                      Minimum guest charge on per-guest add-ons
                    </div>
                    <p>
                      Your party is <b style={{ color: "var(--ivory)" }}>{activeQuotation.guests.toLocaleString("en-IN")} guests</b>.
                      {" "}For add-ons marked <b style={{ color: "var(--ivory)" }}>Min … guests</b>, you are still billed for that
                      minimum even if your headcount is lower — e.g. 100 guests with a 500 minimum means the add-on is charged as{" "}
                      <b style={{ color: "var(--ivory)" }}>500 × rate</b>, not 100.
                      {" "}If your count is higher than the minimum, you pay for the actual count.
                      {" "}The <b style={{ color: "var(--ivory)" }}>package</b> price always stays on your real guest count only.
                    </p>
                  </div>
                </div>

                <div className="relative space-y-3">
                  {selectedAddons.map((id) => {
                    const a = getAddon(id);
                    if (!a) return null;
                    const line = addonLineTotal(a, activeQuotation.guests);
                    const billed = billableGuests(activeQuotation.guests, a.guestRange);
                    const floored = addonUsesGuestFloor(activeQuotation.guests, a.guestRange);
                    const badge = addonMinGuestsBadge(a);
                    const choice = activeQuotation.addonChoices[id];
                    const unitLabel =
                      a.priceType === "per_guest"
                        ? `/guest`
                        : a.priceType === "per_event"
                          ? "/event"
                          : a.priceType === "per_variety"
                            ? "/variety"
                            : "";
                    return (
                      <div
                        key={id}
                        className="rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                        style={{
                          background: "rgba(246,239,224,.04)",
                          border: "1px solid rgba(226,182,88,.2)",
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-display text-[1.12rem]" style={{ color: "var(--ivory)" }}>
                              {a.name}
                            </span>
                            {a.nv && (
                              <span className="text-[0.58rem] font-bold px-1.5 py-0.5 rounded" style={{ background: "#c0392b", color: "#fff" }}>
                                NV
                              </span>
                            )}
                            {badge && (
                              <span
                                className="text-[0.6rem] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full"
                                style={{ background: "rgba(198,152,58,.22)", color: "var(--gold-bright)", border: "1px solid rgba(226,182,88,.35)" }}
                              >
                                {badge}
                              </span>
                            )}
                          </div>
                          {choice && (
                            <div className="text-[0.78rem] mb-1" style={{ color: "rgba(226,182,88,.85)" }}>
                              Choice: {choice}
                            </div>
                          )}
                          <div className="text-[0.78rem]" style={{ color: "rgba(246,239,224,.58)" }}>
                            ₹{a.price.toLocaleString("en-IN")}
                            {unitLabel}
                            {a.priceType === "per_guest" && (
                              <>
                                {" · "}
                                {floored
                                  ? `billed for ${billed.toLocaleString("en-IN")} guests (min range; party has ${activeQuotation.guests})`
                                  : `× ${billed.toLocaleString("en-IN")} guests`}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-2 flex-shrink-0">
                          <div className="font-display text-[1.25rem] whitespace-nowrap" style={{ color: "var(--gold-bright)" }}>
                            ₹{line.toLocaleString("en-IN")}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setBookingStep("addons")}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[0.72rem] font-semibold"
                              style={{ border: "1px solid rgba(226,182,88,.4)", color: "var(--gold-bright)" }}
                              title="Change this extra on the Extras step"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                toggleAddon(id);
                                setToast(`${a.name} removed from extras`);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[0.72rem] font-semibold"
                              style={{ border: "1px solid rgba(196,80,90,.45)", color: "#e8a0a8" }}
                              title="Remove this add-on"
                            >
                              <Trash2 className="w-3 h-3" /> Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div
                  className="relative mt-4 pt-4 flex justify-between items-baseline"
                  style={{ borderTop: "1px solid rgba(226,182,88,.22)" }}
                >
                  <span className="text-[0.8rem] tracking-[0.12em] uppercase" style={{ color: "rgba(246,239,224,.55)" }}>
                    Add-ons subtotal
                  </span>
                  <span className="font-display text-[1.35rem]" style={{ color: "var(--ivory)" }}>
                    ₹{addonsTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}

            <div className="rounded-xl p-5 mb-4" style={{ background: "rgba(47,30,47,.06)" }}>
              <div className="flex justify-between py-1"><span>Menu subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span></div>
              {promoDiscount > 0 && (
                <>
                  <div className="flex justify-between py-1" style={{ color: "#1f7a5c" }}>
                    <span>Offer {promoCode}</span>
                    <span>−₹{promoDiscount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm" style={{ color: "var(--on-ivory-dim)" }}>
                    <span>After offer</span><span>₹{afterOffer.toLocaleString("en-IN")}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-1">
                <span>GST {CONFIG.gstPercent}%</span>
                <span>₹{payableGst.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between font-display text-[1.5rem] pt-2 border-t mt-2" style={{ borderColor: "rgba(58,39,51,.12)" }}>
                <span>Total payable</span>
                <span style={{ color: "var(--anaar)" }}>₹{payableTotal.toLocaleString("en-IN")}</span>
              </div>
              <p className="text-[0.72rem] mt-2" style={{ color: "var(--on-ivory-dim)" }}>
                {promoDiscount > 0
                  ? "Offer first on menu total, then GST is added."
                  : "GST is added on the menu total."}
              </p>
              <div className="text-sm mt-1" style={{ color: "var(--on-ivory-dim)" }}>
                Suggested advance ({CONFIG.advancePercent}%): ₹{advance.toLocaleString("en-IN")}
              </div>
            </div>

            <div
              className="mb-6 rounded-xl p-5"
              style={{
                background: "linear-gradient(135deg,rgba(198,152,58,.18),rgba(246,239,224,.95))",
                border: "2px solid rgba(198,152,58,.55)",
              }}
            >
              <div className="font-display text-[1.35rem] mb-1" style={{ color: "#2c1a26" }}>
                Offer / promo code
              </div>
              <p className="text-sm mb-3" style={{ color: "var(--on-ivory-dim)" }}>
                Try <b>RASA10</b> or <b>FLAT5K</b> — discount applies before GST.
              </p>
              <PromoCodeInput
                theme="light"
                totalRupees={total}
                appliedCode={promoCode}
                appliedDiscountRupees={promoDiscount || undefined}
                onToast={setToast}
                onApplied={(info) => {
                  if (!info) {
                    setPromoCode(null);
                    setPromoDiscount(0);
                    setPromoFinalTotal(null);
                    return;
                  }
                  setPromoCode(info.code);
                  setPromoDiscount(info.discountRupees);
                  setPromoFinalTotal(info.totalRupees);
                }}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setBookingStep("guests")} className="flex-1 py-3.5 rounded-lg font-semibold" style={{ background: "#fff", border: "1px solid rgba(58,39,51,.2)" }}>Back</button>
              <button onClick={proceedFromReview} className="flex-[1.5] py-3.5 rounded-lg font-semibold flex items-center justify-center gap-2" style={{ background: incompleteSections.length ? "rgba(198,152,58,.5)" : "var(--gold)", color: "#231318" }}>
                {incompleteSections.length ? "Fix incomplete courses first" : user ? "Next: Event details" : "Login & continue"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ===== EVENT ===== */}
        {bookingStep === "event" && (
          <div className="max-w-xl mx-auto">
            <h1 className="font-display text-[2rem] sm:text-[2.4rem] mb-2">Event details</h1>
            <p className="mb-6" style={{ color: "var(--on-ivory-dim)" }}>
              {isEditing
                ? "Update logistics. Totals refresh with your menu & extras."
                : `Enter date, venue and city. Suggested advance is ₹${advance.toLocaleString("en-IN")} (${CONFIG.advancePercent}%) — you can also confirm with ₹0 now and pay later.`}
            </p>
            {eventDate && (
              <div className="rounded-lg p-3 mb-5 text-sm" style={{ background: "rgba(31,122,92,.08)", border: "1px solid rgba(31,122,92,.2)" }}>
                You can keep editing the menu until <b>{fmtShortDate(editCutoffDate(eventDate))}</b> ({CONFIG.editWindowDays} days before the event). After that the kitchen locks the plan.
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[0.72rem] tracking-[0.12em] uppercase mb-1.5 font-bold" style={{ color: "var(--on-ivory-dim)" }}>Event date *</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--on-ivory-dim)" }} />
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full rounded-lg pl-10 pr-3 py-3.5 text-[1rem]" style={{ border: "1px solid rgba(58,39,51,.22)", background: "#fff" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.72rem] tracking-[0.12em] uppercase mb-1.5 font-bold" style={{ color: "var(--on-ivory-dim)" }}>City *</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--on-ivory-dim)" }} />
                    <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-lg pl-10 pr-3 py-3.5" style={{ border: "1px solid rgba(58,39,51,.22)", background: "#fff" }} />
                  </div>
                </div>
                <div>
                  <label className="block text-[0.72rem] tracking-[0.12em] uppercase mb-1.5 font-bold" style={{ color: "var(--on-ivory-dim)" }}>Guests</label>
                  <div className="relative">
                    <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--on-ivory-dim)" }} />
                    <input type="number" value={activeQuotation.guests} onChange={(e) => setActiveQuotation({ guests: Math.max(CONFIG.minGuests, parseInt(e.target.value) || CONFIG.minGuests) })} className="w-full rounded-lg pl-10 pr-3 py-3.5" style={{ border: "1px solid rgba(58,39,51,.22)", background: "#fff" }} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[0.72rem] tracking-[0.12em] uppercase mb-1.5 font-bold" style={{ color: "var(--on-ivory-dim)" }}>Venue *</label>
                <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Hotel Alcor, Bistupur" className="w-full rounded-lg px-3 py-3.5" style={{ border: "1px solid rgba(58,39,51,.22)", background: "#fff" }} />
              </div>
              <div>
                <label className="block text-[0.72rem] tracking-[0.12em] uppercase mb-1.5 font-bold" style={{ color: "var(--on-ivory-dim)" }}>Occasion</label>
                <select value={occasion} onChange={(e) => setOccasion(e.target.value)} className="w-full rounded-lg px-3 py-3.5" style={{ border: "1px solid rgba(58,39,51,.22)", background: "#fff" }}>
                  <option>Wedding</option><option>Reception</option><option>Birthday</option>
                  <option>Corporate event</option><option>Housewarming</option><option>Festival</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[0.72rem] tracking-[0.12em] uppercase mb-1.5 font-bold" style={{ color: "var(--on-ivory-dim)" }}>Notes (optional)</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dietary notes, timing…" className="w-full rounded-lg px-3 py-3.5" style={{ border: "1px solid rgba(58,39,51,.22)", background: "#fff" }} />
              </div>
            </div>

            {err && <div className="text-center text-sm font-semibold mb-4" style={{ color: "var(--anaar)" }}>{err}</div>}

            <div className="rounded-xl p-4 mb-4 text-sm space-y-2" style={{ background: "rgba(47,30,47,.06)", border: "1px solid rgba(58,39,51,.1)" }}>
              <div className="flex justify-between"><span>Menu + add-ons</span><span>₹{subtotal.toLocaleString("en-IN")}</span></div>
              {promoDiscount > 0 && (
                <>
                  <div className="flex justify-between" style={{ color: "#1f7a5c" }}>
                    <span>Offer {promoCode}</span>
                    <span>−₹{promoDiscount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between" style={{ color: "var(--on-ivory-dim)" }}>
                    <span>After offer</span>
                    <span>₹{afterOffer.toLocaleString("en-IN")}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span>GST {CONFIG.gstPercent}%</span>
                <span>₹{payableGst.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between font-semibold pt-1 border-t" style={{ borderColor: "rgba(58,39,51,.12)" }}>
                <span>Total payable</span>
                <b>₹{payableTotal.toLocaleString("en-IN")}</b>
              </div>
              <p className="text-[0.72rem]" style={{ color: "var(--on-ivory-dim)" }}>
                {promoDiscount > 0
                  ? "Offer first on menu total, then GST is added."
                  : "GST is added on the menu total."}
              </p>
              <div className="flex justify-between" style={{ color: "var(--on-ivory-dim)" }}>
                <span>Suggested advance ({CONFIG.advancePercent}%)</span>
                <span>₹{advance.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div
              className="mb-4 rounded-xl p-4"
              style={{
                background: "linear-gradient(135deg,rgba(198,152,58,.15),#fff)",
                border: "2px solid rgba(198,152,58,.5)",
              }}
            >
              <div className="font-display text-[1.2rem] mb-2" style={{ color: "#2c1a26" }}>
                Offer code{isEditing && promoCode ? " (already applied)" : ""}
              </div>
              <PromoCodeInput
                theme="light"
                totalRupees={total}
                appliedCode={promoCode}
                appliedDiscountRupees={promoDiscount || undefined}
                onToast={setToast}
                onApplied={(info) => {
                  if (!info) {
                    setPromoCode(null);
                    setPromoDiscount(0);
                    setPromoFinalTotal(null);
                    return;
                  }
                  setPromoCode(info.code);
                  setPromoDiscount(info.discountRupees);
                  setPromoFinalTotal(info.totalRupees);
                }}
              />
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={() => setBookingStep("review")} className="w-full py-3 rounded-lg font-semibold" style={{ background: "#fff", border: "1px solid rgba(58,39,51,.2)" }}>Back</button>
              {isEditing ? (
                <button onClick={() => confirmBooking(0)} disabled={loading} className="w-full glossy-btn-gold py-3.5 rounded-lg font-semibold disabled:opacity-60">
                  {loading ? "Saving…" : "Save changes"}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => confirmBooking(0)}
                    disabled={loading}
                    className="w-full glossy-btn-gold py-3.5 rounded-lg font-semibold disabled:opacity-60"
                  >
                    {loading ? "Confirming…" : "Confirm booking — pay now or later"}
                  </button>
                  <p className="text-center text-[0.78rem]" style={{ color: "var(--on-ivory-dim)" }}>
                    Your booking is locked first. Next screen lets you pay suggested advance (₹{advance.toLocaleString("en-IN")}) via Stripe or UPI QR anytime.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* ===== SUCCESS ===== */}
        {bookingStep === "success" && bookingRef && (
          <div className="max-w-lg mx-auto py-8">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: "#1f7a5c" }} />
              <h1 className="font-display text-[2.2rem] mb-2">{savedAsEdit ? "Booking updated!" : "Booking confirmed!"}</h1>
              <p className="mb-6" style={{ color: "var(--on-ivory-dim)" }}>
                Reference <b style={{ color: "#2c1a26" }}>{bookingRef}</b>
                {!savedAsEdit && (
                  paidAdvance > 0
                    ? <> · Advance ₹{paidAdvance.toLocaleString("en-IN")} recorded.</>
                    : <> · You can pay the suggested advance now or from My Bookings anytime.</>
                )}
                {" "}Our team will call you within 24 hours.
              </p>
            </div>

            {bookingId && (balanceDue > 0 || (!savedAsEdit && paidAdvance <= 0)) && (
              <div className="mb-5">
                <div className="font-display text-[1.25rem] mb-2 text-center" style={{ color: "#2c1a26" }}>
                  Pay now
                </div>
                <PayBookingPanel
                  bookingId={bookingId}
                  bookingRef={bookingRef || undefined}
                  defaultAmountRupees={Math.min(
                    advance,
                    balanceDue > 0 ? balanceDue : payableTotal
                  )}
                  maxAmountRupees={balanceDue > 0 ? balanceDue : payableTotal}
                  theme="light"
                  allowPromo={false}
                  onToast={setToast}
                  onPaid={({ amountRupees, method }) => {
                    if (method === "upi") setToast("UPI claim sent — pay panel stays until admin confirms");
                    else {
                      setPaidAdvance((p) => p + amountRupees);
                      setBalanceDue((b) => Math.max(0, b - amountRupees));
                    }
                  }}
                />
              </div>
            )}

            <div className="text-left rounded-xl p-5 mb-5 space-y-3" style={{ background: "#fff", border: "1px solid rgba(58,39,51,.12)" }}>
              <div className="font-display text-[1.2rem] mb-1">What happens next</div>
              {[
                "We confirm kitchen capacity for your date.",
                eventDate
                  ? `Polish menu & extras until ${fmtShortDate(editCutoffDate(eventDate))} — open My Bookings → Edit.`
                  : `You can edit the menu until ${CONFIG.editWindowDays} days before the event.`,
                "Want live counters or mithai? Add them while editing is open.",
                "Balance anytime via Stripe or UPI QR from My Bookings.",
              ].map((line, i) => (
                <div key={line} className="flex gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: "rgba(198,152,58,.2)", color: "#2c1a26" }}>{i + 1}</span>
                  <span style={{ color: "var(--on-ivory-dim)" }}>{line}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => window.open(`/api/quotation-pdf?bookingId=${bookingId}`, "_blank")} className="glossy-btn-gold py-3 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm">
                <FileText className="w-4 h-4" /> Download Quotation PDF
              </button>
              <button
                onClick={async () => {
                  const res = await fetch("/api/bookings/share", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ bookingId, menu: selected, addons: selectedAddons, guests: activeQuotation.guests, total }),
                  });
                  const data = await res.json();
                  if (data.whatsappUrl) window.open(data.whatsappUrl, "_blank");
                }}
                className="glossy-btn-wa py-3 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm"
              >
                <Share2 className="w-4 h-4" /> WhatsApp
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { resetQuotation(); setView("user-dashboard"); }} className="glossy-btn-gold py-3 rounded-lg font-semibold">My Bookings</button>
              <button onClick={() => { resetQuotation(); closeBooking(); }} className="py-3 rounded-lg font-semibold" style={{ background: "#fff", border: "1px solid rgba(58,39,51,.2)" }}>Home</button>
            </div>
          </div>
        )}
      </main>

      {/* Mobile estimate footer */}
      {bookingStep !== "success" && (
        <div className="sm:hidden sticky bottom-0 border-t px-4 py-3 flex items-center justify-between" style={{ background: "#2f1e2f", borderColor: "rgba(198,152,58,.25)" }}>
          <div>
            <div className="text-[0.62rem] uppercase" style={{ color: "rgba(246,239,224,.5)" }}>Estimate incl. GST</div>
            <div className="font-display text-[1.2rem]" style={{ color: "var(--gold-bright)" }}>₹{total.toLocaleString("en-IN")}</div>
          </div>
          <div className="text-[0.72rem]" style={{ color: "rgba(246,239,224,.62)" }}>{completionPct}% menu done</div>
        </div>
      )}
    </div>
  );
}
