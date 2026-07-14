"use client";
import { useState } from "react";
import { useApp } from "@/store/app-store";
import { CONFIG } from "@/lib/rasa-data";
import { useCatalog } from "@/store/catalog-store";
import { addonLineTotal, billableGuests, addonUsesGuestFloor, addonPricingNote } from "@/lib/addon-pricing";
import PromoCodeInput from "@/components/rasa/promo-code-input";
import PayBookingPanel from "@/components/rasa/pay-booking-panel";
import { X, ArrowRight, CheckCircle, Calendar, MapPin, Users, FileText, Share2 } from "lucide-react";

export default function QuotationPanel() {
  const { quotationPanelOpen, setQuotationPanel, activeQuotation, user, resetQuotation, setToast, setView } = useApp();
  const { getPackage, getAddon } = useCatalog();
  const [step, setStep] = useState<"quote" | "checkout" | "success">("quote");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState(user?.city || "Jamshedpur");
  const [occasion, setOccasion] = useState("Wedding");
  const [notes, setNotes] = useState("");
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [balanceDue, setBalanceDue] = useState(0);
  const [paidAdvance, setPaidAdvance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoFinalTotal, setPromoFinalTotal] = useState<number | null>(null);

  if (!quotationPanelOpen) return null;

  const pkg = activeQuotation.packageId ? getPackage(activeQuotation.packageId) : undefined;
  if (!pkg) return null;

  const calcTotal = () => {
    const pkgTotal = pkg.price * activeQuotation.guests;
    const addonsTotal = activeQuotation.selectedAddons.reduce((sum, id) => {
      const a = getAddon(id);
      if (!a) return sum;
      return sum + addonLineTotal(a, activeQuotation.guests);
    }, 0);
    const subtotal = pkgTotal + addonsTotal;
    const gst = Math.round(subtotal * 0.05);
    return { pkgTotal, addonsTotal, subtotal, gst, total: subtotal + gst };
  };
  const { pkgTotal, addonsTotal, subtotal, total } = calcTotal();
  const afterOffer = Math.max(0, subtotal - (promoDiscount || 0));
  const payableGst = Math.round(afterOffer * (CONFIG.gstPercent / 100));
  const payableTotal = afterOffer + payableGst;
  const advance = Math.round(payableTotal * (CONFIG.advancePercent / 100));

  const applyPromo = (info: {
    code: string;
    discountRupees: number;
    totalRupees: number;
    label: string;
  } | null) => {
    if (!info) {
      setPromoCode(null);
      setPromoDiscount(0);
      setPromoFinalTotal(null);
      return;
    }
    setPromoCode(info.code);
    setPromoDiscount(info.discountRupees);
    setPromoFinalTotal(info.totalRupees);
  };

  const close = () => {
    setQuotationPanel(false);
    setStep("quote");
    setEventDate(""); setVenue(""); setNotes("");
    setBookingRef(null);
    setBookingId(null);
    setBalanceDue(0);
    setPaidAdvance(0);
    setErr(null);
    setPromoCode(null);
    setPromoDiscount(0);
    setPromoFinalTotal(null);
  };

  const confirmBooking = async () => {
    if (!eventDate || !venue || !city) { setErr("Please fill event date, venue, and city"); return; }
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: pkg.id,
          eventDate, venue, city,
          guests: activeQuotation.guests,
          total, // gross before promo — server applies promoCode
          advancePaid: 0,
          menuSnapshot: activeQuotation.selectedDishes,
          addonsSnapshot: activeQuotation.selectedAddons.map((id) => {
            const a = getAddon(id);
            return {
              id,
              name: a?.name,
              price: a?.price,
              priceType: a?.priceType,
              guestRange: a?.guestRange || 0,
              choice: activeQuotation.addonChoices[id] || null,
            };
          }),
          customDishes: activeQuotation.customDishes,
          occasion,
          notes,
          promoCode: promoCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      setBookingRef(data.booking.bookingRef);
      setBookingId(data.booking.id);
      setPaidAdvance(Math.round((data.booking.advancePaid || 0) / 100));
      setBalanceDue(Math.round((data.booking.balance || data.booking.total || 0) / 100));
      setStep("success");
      setToast("Booking confirmed — you can pay below");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    window.open(`/api/quotation-pdf?bookingId=${bookingId}`, "_blank");
  };

  const shareWhatsApp = async () => {
    try {
      const res = await fetch("/api/bookings/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          menu: activeQuotation.selectedDishes,
          addons: activeQuotation.selectedAddons.map((id) => {
            const a = getAddon(id);
            return {
              id,
              name: a?.name,
              price: a?.price,
              priceType: a?.priceType,
              guestRange: a?.guestRange || 0,
            };
          }),
          guests: activeQuotation.guests,
          total,
        }),
      });
      const data = await res.json();
      if (data.whatsappUrl) window.open(data.whatsappUrl, "_blank");
    } catch (e) {
      setToast("Share failed");
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-5" style={{ background: "rgba(14,7,13,.74)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)" }}>
      <div className="glass-panel-ivory rounded-xl p-7 w-full max-w-[680px] relative max-h-[90vh] overflow-y-auto">
        <button onClick={close} className="absolute top-4 right-4 w-[34px] h-[34px] rounded-full border flex items-center justify-center transition-colors hover:bg-red-700 hover:text-white hover:border-red-700" style={{ border: "1px solid rgba(58,39,51,.2)", color: "#2c1a26" }}>
          <X className="w-4 h-4" />
        </button>

        {step === "quote" && (
          <>
            <div className="text-[0.72rem] font-semibold tracking-[0.32em] uppercase mb-1" style={{ color: "var(--anaar)" }}>Your Quotation</div>
            <h3 className="font-display text-[1.9rem] mb-5" style={{ color: "#2c1a26" }}>Menu &amp; estimate</h3>

            {/* Menu block */}
            <div className="py-4 border-t" style={{ borderColor: "rgba(58,39,51,.14)" }}>
              <h4 className="font-display text-[1.2rem] flex justify-between items-baseline gap-3 mb-1" style={{ color: "#2c1a26" }}>
                <span>{pkg.name} · ₹{pkg.price}/guest × {activeQuotation.guests}</span>
                <span className="text-[0.82rem] font-semibold" style={{ color: "var(--anaar)" }}>₹{pkgTotal.toLocaleString("en-IN")}</span>
              </h4>
              {pkg.sections.map((s) => {
                const sel = activeQuotation.selectedDishes[s.section] || [];
                if (sel.length === 0) return <div key={s.section} className="text-[0.9rem] italic py-1" style={{ color: "var(--on-ivory-dim)" }}>{s.section}: nothing selected</div>;
                return (
                  <div key={s.section} className="text-[0.9rem] py-1 leading-relaxed" style={{ color: "var(--on-ivory-dim)" }}>
                    <b style={{ color: "#2c1a26", fontWeight: 600 }}>{s.section}:</b> {sel.join(", ")}
                  </div>
                );
              })}
            </div>

            {/* Add-ons block */}
            {activeQuotation.selectedAddons.length > 0 && (
              <div className="py-4 border-t" style={{ borderColor: "rgba(58,39,51,.14)" }}>
                <h4 className="font-display text-[1.2rem] mb-2" style={{ color: "#2c1a26" }}>Add-ons</h4>
                {activeQuotation.selectedAddons.map((id) => {
                  const a = getAddon(id);
                  if (!a) return null;
                  const price = addonLineTotal(a, activeQuotation.guests);
                  const billed = billableGuests(activeQuotation.guests, a.guestRange);
                  const floored = addonUsesGuestFloor(activeQuotation.guests, a.guestRange);
                  return (
                    <div key={id} className="flex justify-between text-[0.9rem] py-1" style={{ color: "#2c1a26" }}>
                      <span>
                        {a.name}{activeQuotation.addonChoices[id] ? ` · ${activeQuotation.addonChoices[id]}` : ""}
                        {a.priceType === "per_guest" && (
                          <span className="block text-[0.72rem]" style={{ color: "var(--on-ivory-dim)" }}>
                            {addonPricingNote(a, activeQuotation.guests) ||
                              (floored
                                ? `₹${a.price} × ${billed} guests (min range)`
                                : `₹${a.price} × ${billed} guests`)}
                          </span>
                        )}
                      </span>
                      <span className="font-semibold" style={{ color: "var(--anaar)" }}>₹{price.toLocaleString("en-IN")}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between text-[0.9rem] py-1 mt-1" style={{ color: "var(--on-ivory-dim)" }}>
                  <span>Add-ons subtotal</span>
                  <span>₹{addonsTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            )}

            {/* Pricing */}
            <div className="rounded-lg p-5 mt-4" style={{ background: "var(--ivory-2)" }}>
              <div className="flex justify-between text-[0.94rem] py-1" style={{ color: "#3a2733" }}>
                <span>Menu subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              {promoDiscount > 0 && (
                <>
                  <div className="flex justify-between text-[0.94rem] py-1" style={{ color: "#1f7a5c" }}>
                    <span>Offer {promoCode}</span>
                    <span>−₹{promoDiscount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-[0.94rem] py-1" style={{ color: "var(--on-ivory-dim)" }}>
                    <span>After offer</span><span>₹{afterOffer.toLocaleString("en-IN")}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-[0.94rem] py-1" style={{ color: "#3a2733" }}>
                <span>GST @ {CONFIG.gstPercent}%</span>
                <span>₹{payableGst.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between font-display text-[1.35rem] pt-3 mt-2 border-t" style={{ color: "#2c1a26", borderColor: "rgba(58,39,51,.2)" }}>
                <span>Total payable</span><span style={{ color: "var(--anaar)" }}>₹{payableTotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="text-[0.78rem] mt-2" style={{ color: "var(--on-ivory-dim)" }}>
                {promoDiscount > 0
                  ? "Offer first on menu total, then GST is added. "
                  : "GST is added on the menu total. "}
                Suggested advance ({CONFIG.advancePercent}%): <b style={{ color: "var(--anaar)" }}>₹{advance.toLocaleString("en-IN")}</b>
                {" · "}Balance ₹{(payableTotal - advance).toLocaleString("en-IN")}.
              </div>
            </div>

            <div
              className="mt-4 rounded-lg p-4"
              style={{
                background: "linear-gradient(135deg,rgba(198,152,58,.18),#fff)",
                border: "2px solid rgba(198,152,58,.55)",
              }}
            >
              <div className="font-display text-[1.2rem] mb-1" style={{ color: "#2c1a26" }}>
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
                onApplied={applyPromo}
              />
            </div>

            <button onClick={() => setStep("checkout")} className="glossy-btn-gold w-full py-3.5 rounded-md font-semibold tracking-[0.03em] text-[0.95rem] mt-5 flex items-center justify-center gap-2">
              Proceed to Checkout
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {step === "checkout" && (
          <>
            <div className="text-[0.72rem] font-semibold tracking-[0.32em] uppercase mb-1" style={{ color: "var(--anaar)" }}>Checkout</div>
            <h3 className="font-display text-[1.9rem] mb-1" style={{ color: "#2c1a26" }}>Confirm your event</h3>
            <p className="text-[0.88rem] mb-5 font-light" style={{ color: "var(--on-ivory-dim)" }}>
              Payable total <b style={{ color: "var(--anaar)" }}>₹{payableTotal.toLocaleString("en-IN")}</b>
              {promoCode ? ` (promo ${promoCode})` : ""}. Pay advance via Stripe or UPI after confirming.
            </p>

            <div
              className="mb-5 rounded-lg p-4"
              style={{
                background: "linear-gradient(135deg,rgba(198,152,58,.15),#fff)",
                border: "2px solid rgba(198,152,58,.5)",
              }}
            >
              <div className="font-display text-[1.15rem] mb-2" style={{ color: "#2c1a26" }}>
                Offer code
              </div>
              <PromoCodeInput
                theme="light"
                totalRupees={total}
                appliedCode={promoCode}
                appliedDiscountRupees={promoDiscount || undefined}
                onToast={setToast}
                onApplied={applyPromo}
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[0.72rem] tracking-[0.12em] uppercase mb-1.5" style={{ color: "var(--on-ivory-dim)" }}>Event date</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required className="w-full rounded-md pl-10 pr-3 py-3 text-[0.95rem]" style={{ border: "1px solid rgba(58,39,51,.22)", background: "#fff", color: "#2c1a26" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.72rem] tracking-[0.12em] uppercase mb-1.5" style={{ color: "var(--on-ivory-dim)" }}>City</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={city} onChange={(e) => setCity(e.target.value)} required className="w-full rounded-md pl-10 pr-3 py-3 text-[0.95rem]" style={{ border: "1px solid rgba(58,39,51,.22)", background: "#fff", color: "#2c1a26" }} />
                  </div>
                </div>
                <div>
                  <label className="block text-[0.72rem] tracking-[0.12em] uppercase mb-1.5" style={{ color: "var(--on-ivory-dim)" }}>Guests</label>
                  <div className="relative">
                    <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="number" value={activeQuotation.guests} readOnly className="w-full rounded-md pl-10 pr-3 py-3 text-[0.95rem] opacity-70" style={{ border: "1px solid rgba(58,39,51,.22)", background: "var(--ivory-2)", color: "#2c1a26" }} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[0.72rem] tracking-[0.12em] uppercase mb-1.5" style={{ color: "var(--on-ivory-dim)" }}>Venue name &amp; address</label>
                <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Hotel Alcor, Bistupur" required className="w-full rounded-md px-3 py-3 text-[0.95rem]" style={{ border: "1px solid rgba(58,39,51,.22)", background: "#fff", color: "#2c1a26" }} />
              </div>
              <div>
                <label className="block text-[0.72rem] tracking-[0.12em] uppercase mb-1.5" style={{ color: "var(--on-ivory-dim)" }}>Occasion</label>
                <select value={occasion} onChange={(e) => setOccasion(e.target.value)} className="w-full rounded-md px-3 py-3 text-[0.95rem]" style={{ border: "1px solid rgba(58,39,51,.22)", background: "#fff", color: "#2c1a26" }}>
                  <option>Wedding</option><option>Reception</option><option>Birthday</option>
                  <option>Corporate event</option><option>Housewarming</option><option>Festival</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[0.72rem] tracking-[0.12em] uppercase mb-1.5" style={{ color: "var(--on-ivory-dim)" }}>Special instructions (optional)</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dietary notes, decor coordination, parking…" className="w-full rounded-md px-3 py-3 text-[0.95rem]" style={{ border: "1px solid rgba(58,39,51,.22)", background: "#fff", color: "#2c1a26" }} />
              </div>
            </div>

            {err && <div className="text-sm font-semibold text-red-700 text-center mt-4">{err}</div>}

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={() => setStep("quote")} className="py-3 rounded-md font-semibold border" style={{ border: "1px solid rgba(58,39,51,.3)", color: "#3a2733", background: "#fff" }}>
                Back
              </button>
              <button onClick={confirmBooking} disabled={loading} className="glossy-btn-gold py-3 rounded-md font-semibold tracking-[0.03em] text-[0.95rem] disabled:opacity-60">
                {loading ? "Processing…" : `Confirm · then pay ₹${advance.toLocaleString("en-IN")}+`}
              </button>
            </div>
          </>
        )}

        {step === "success" && bookingRef && (
          <div className="text-center py-6">
            <div className="flex justify-center gap-2 mb-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className={`taste-dot ${["t-sweet", "t-sour", "t-salt", "t-pungent", "t-bitter", "t-astr"][i]}`} style={{ width: 8, height: 8 }} />
              ))}
            </div>
            <CheckCircle className="w-16 h-16 mx-auto mb-3" style={{ color: "#1f7a5c" }} />
            <h3 className="font-display text-[2rem] mb-2" style={{ color: "#2c1a26" }}>Booking confirmed!</h3>
            <p className="text-[1rem] mb-5" style={{ color: "var(--on-ivory-dim)" }}>
              Your booking reference is <b style={{ color: "#2c1a26" }}>{bookingRef}</b>.<br />
              Total <b style={{ color: "var(--anaar)" }}>₹{payableTotal.toLocaleString("en-IN")}</b>
              {promoCode ? ` with promo ${promoCode}` : ""}.
              Suggested advance <b style={{ color: "var(--anaar)" }}>₹{advance.toLocaleString("en-IN")}</b> — pay below or later from My Bookings.
            </p>

            {bookingId && balanceDue > 0 && (
              <div className="text-left mb-5">
                <PayBookingPanel
                  bookingId={bookingId}
                  bookingRef={bookingRef || undefined}
                  defaultAmountRupees={Math.min(advance, balanceDue)}
                  maxAmountRupees={balanceDue}
                  theme="light"
                  allowPromo={false}
                  onToast={setToast}
                  onPaid={({ amountRupees, method }) => {
                    if (method === "upi") setToast("UPI claim sent");
                    else {
                      setPaidAdvance((p) => p + amountRupees);
                      setBalanceDue((b) => Math.max(0, b - amountRupees));
                    }
                  }}
                />
              </div>
            )}

            {activeQuotation.customDishes && activeQuotation.customDishes.length > 0 && (
              <div className="text-left mb-5 p-3 rounded-md" style={{ background: "rgba(198,152,58,.08)", border: "1px solid var(--paper-line)" }}>
                <div className="text-[0.72rem] tracking-[0.14em] uppercase font-bold mb-2" style={{ color: "var(--gold)" }}>Your custom dish requests</div>
                {activeQuotation.customDishes.map((d, i) => (
                  <div key={i} className="text-[0.86rem]" style={{ color: "#2c1a26" }}>• {d}</div>
                ))}
                <div className="text-[0.72rem] mt-2 italic" style={{ color: "var(--on-ivory-dim)" }}>Our chef will confirm these with pricing.</div>
              </div>
            )}

            <div className="text-[0.84rem] italic mb-5 font-display" style={{ color: "var(--gold)" }}>
              रस — may your table carry all six tastes.
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <button onClick={generatePDF} className="glossy-btn-gold py-3 rounded-md font-semibold flex items-center justify-center gap-2 text-[0.86rem]">
                <FileText className="w-4 h-4" /> Download Quotation PDF
              </button>
              <button onClick={shareWhatsApp} className="glossy-btn-wa py-3 rounded-md font-semibold flex items-center justify-center gap-2 text-[0.86rem]">
                <Share2 className="w-4 h-4" /> Share to WhatsApp
              </button>
            </div>

            <div className="text-[0.74rem] mb-4" style={{ color: "var(--on-ivory-dim)" }}>
              📞 You can edit this booking (add-ons, custom dishes) until <b>{CONFIG.editWindowDays} days before</b> the event.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { close(); resetQuotation(); setView("user-dashboard"); }} className="glossy-btn-gold py-3 rounded-md font-semibold">
                View My Bookings
              </button>
              <button onClick={() => { close(); resetQuotation(); }} className="py-3 rounded-md font-semibold border" style={{ border: "1px solid rgba(58,39,51,.3)", color: "#3a2733", background: "#fff" }}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
