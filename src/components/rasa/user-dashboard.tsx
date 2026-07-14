"use client";
import { useState, useEffect } from "react";
import { useApp } from "@/store/app-store";
import { CONFIG } from "@/lib/rasa-data";
import {
  canEditBooking, daysUntilEvent, editCutoffDate, fmtShortDate, buildBookingNextSteps,
} from "@/lib/booking-journey";
import { ArrowLeft, Calendar, Users, MapPin, Phone, Mail, LogOut, Wallet, Bell, Star, Pencil, CheckCircle2, Lock } from "lucide-react";
import PayBookingPanel from "@/components/rasa/pay-booking-panel";
import PaymentHistory from "@/components/rasa/payment-history";
import PromoCodeInput from "@/components/rasa/promo-code-input";

interface Booking {
  id: string; bookingRef: string; eventDate: string; venue: string; city: string;
  guests: number; status: string; total: number; advancePaid: number; balance: number;
  subtotal?: number;
  occasion?: string | null; notes?: string | null;
  menuSnapshot?: string | null; addonsSnapshot?: string | null; customDishes?: string | null;
  package?: { name: string; slug: string; id?: string } | null;
  discount?: number;
  discountNote?: string | null;
  promoCode?: { code: string; label: string } | null;
  payments?: {
    id: string;
    amount: number;
    method: string;
    status: string;
    gateway?: string;
    note?: string | null;
    proofUrl?: string | null;
    createdAt?: string;
    confirmedAt?: string | null;
  }[];
}

interface Quotation {
  id: string; guests: number; total: number; status: string; createdAt: string;
  package?: { name: string; slug: string } | null;
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export default function UserDashboard() {
  const { user, setUser, setView, setAuthModal, setToast, openMenuBuilder, openBookingEditor, resetQuotation } = useApp();
  const [tab, setTab] = useState<"overview" | "bookings" | "quotations" | "profile" | "notifications">("overview");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payBookingId, setPayBookingId] = useState<string | null>(null);

  const refreshBookings = () => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((b) => setBookings(b.bookings || []))
      .catch(() => {});
  };

  useEffect(() => {
    if (!user) { setAuthModal("login"); return; }
    Promise.all([
      fetch("/api/bookings").then((r) => r.json()),
      fetch("/api/quotations").then((r) => r.json()),
    ]).then(([b, q]) => {
      setBookings(b.bookings || []);
      setQuotations(q.quotations || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, setAuthModal]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setView("landing");
    setToast("Logged out");
  };

  const startEdit = (b: Booking) => {
    if (!canEditBooking(b.eventDate, b.status)) {
      setToast(`Edit window closed. Call ${CONFIG.phoneDisplay}`);
      return;
    }
    const slug = b.package?.slug;
    if (!slug) {
      setToast("Package missing on this booking — contact support");
      return;
    }
    const menu = parseJson<Record<string, string[]>>(b.menuSnapshot, {});
    const addonsRaw = parseJson<Array<{ id?: string } | string>>(b.addonsSnapshot, []);
    const selectedAddons = addonsRaw.map((a) => (typeof a === "string" ? a : a.id || "")).filter(Boolean);
    const addonChoices: Record<string, string | null> = {};
    addonsRaw.forEach((a) => {
      if (typeof a === "object" && a.id && "choice" in a) {
        addonChoices[a.id] = (a as { choice?: string | null }).choice || null;
      }
    });
    const custom = parseJson<string[]>(b.customDishes, []);
    openBookingEditor({
      bookingId: b.id,
      bookingRef: b.bookingRef,
      packageSlug: slug,
      guests: b.guests,
      selectedDishes: menu,
      selectedAddons,
      addonChoices,
      customDishes: custom,
      eventDate: b.eventDate,
      venue: b.venue,
      city: b.city,
      occasion: b.occasion || undefined,
      notes: b.notes || undefined,
      promoCode: b.promoCode?.code || null,
      promoDiscountRupees: b.discount ? Math.round(b.discount / 100) : 0,
      promoTotalRupees: b.total ? Math.round(b.total / 100) : 0,
    });
    setToast(
      b.promoCode?.code
        ? `Edit mode — offer ${b.promoCode.code} is already applied`
        : "Edit mode — change extras or menu, then save"
    );
  };

  if (!user) return null;

  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const fmtMoney = (n: number) => "₹" + (n / 100).toLocaleString("en-IN");
  const statusColor = (s: string) => {
    if (s === "confirmed") return { bg: "rgba(31,122,92,.15)", color: "#1f7a5c" };
    if (s === "completed") return { bg: "rgba(198,152,58,.15)", color: "var(--gold)" };
    if (s === "cancelled") return { bg: "rgba(156,42,56,.15)", color: "var(--anaar)" };
    return { bg: "rgba(198,152,58,.10)", color: "var(--gold-bright)" };
  };

  return (
    <div className="min-h-screen pt-[100px] pb-20">
      <div className="max-w-[1220px] mx-auto px-5 sm:px-7">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setView("landing")} className="w-10 h-10 rounded-full border flex items-center justify-center" style={{ borderColor: "var(--paper-line)" }}>
              <ArrowLeft className="w-4 h-4" style={{ color: "var(--ivory)" }} />
            </button>
            <div>
              <div className="text-[0.72rem] tracking-[0.32em] uppercase mb-1" style={{ color: "var(--gold)" }}>Welcome back</div>
              <h1 className="font-display text-[2rem]" style={{ color: "var(--ivory)" }}>{user.name || user.email}</h1>
            </div>
          </div>
          <button onClick={logout} className="glossy-btn-ghost px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Bookings", value: bookings.length, icon: Calendar, color: "var(--gold-bright)" },
            { label: "Active Events", value: bookings.filter((b) => b.status === "confirmed").length, icon: Star, color: "var(--gold)" },
            { label: "Saved Quotations", value: quotations.length, icon: Wallet, color: "var(--anaar-bright)" },
            { label: "Loyalty Points", value: Math.floor(bookings.reduce((s, b) => s + b.total / 100, 0) / 100), icon: Bell, color: "#AEBB55" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="glass-panel rounded-lg p-5">
                <Icon className="w-5 h-5 mb-2" style={{ color: stat.color }} />
                <div className="text-[0.72rem] tracking-[0.16em] uppercase" style={{ color: "rgba(246,239,224,.62)" }}>{stat.label}</div>
                <div className="font-display text-[1.8rem] mt-1" style={{ color: "var(--ivory)" }}>{stat.value}</div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 mb-6 border-b" style={{ borderColor: "var(--paper-line)" }}>
          {[
            { id: "overview", label: "Overview" },
            { id: "bookings", label: "My Bookings" },
            { id: "quotations", label: "Quotations" },
            { id: "notifications", label: "Notifications" },
            { id: "profile", label: "Profile" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className="px-4 py-3 text-[0.88rem] font-medium border-b-2 transition-colors"
              style={tab === t.id
                ? { color: "var(--gold-bright)", borderColor: "var(--gold-bright)" }
                : { color: "rgba(246,239,224,.62)", borderColor: "transparent" }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="glass-panel rounded-lg p-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-display text-[1.4rem]" style={{ color: "var(--ivory)" }}>Upcoming events</h3>
                <button onClick={() => { resetQuotation(); setView("landing"); setTimeout(() => document.getElementById("packages")?.scrollIntoView(), 100); }} className="glossy-btn-gold px-4 py-2 rounded-full text-sm font-semibold">
                  + New Booking
                </button>
              </div>
              {bookings.filter((b) => b.status === "confirmed").length === 0 ? (
                <div className="text-center py-8" style={{ color: "rgba(246,239,224,.62)" }}>
                  No upcoming events. Start a new booking to see it here.
                </div>
              ) : (
                bookings.filter((b) => b.status === "confirmed").map((b) => (
                  <BookingCard
                    key={b.id}
                    b={b}
                    fmtDate={fmtDate}
                    fmtMoney={fmtMoney}
                    statusColor={statusColor}
                    expanded={expandedId === b.id}
                    onToggle={() => setExpandedId(expandedId === b.id ? null : b.id)}
                    onEdit={() => startEdit(b)}
                    payOpen={payBookingId === b.id}
                    onPayToggle={() => setPayBookingId(payBookingId === b.id ? null : b.id)}
                    onPaid={() => { refreshBookings(); setPayBookingId(null); }}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {tab === "bookings" && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8" style={{ color: "rgba(246,239,224,.62)" }}>Loading…</div>
            ) : bookings.length === 0 ? (
              <div className="glass-panel rounded-lg p-8 text-center" style={{ color: "rgba(246,239,224,.62)" }}>
                No bookings yet. Pick a package to get started.
              </div>
            ) : (
              bookings.map((b) => (
                <BookingCard
                  key={b.id}
                  b={b}
                  fmtDate={fmtDate}
                  fmtMoney={fmtMoney}
                  statusColor={statusColor}
                  expanded={expandedId === b.id}
                  onToggle={() => setExpandedId(expandedId === b.id ? null : b.id)}
                  onEdit={() => startEdit(b)}
                  payOpen={payBookingId === b.id}
                  onPayToggle={() => setPayBookingId(payBookingId === b.id ? null : b.id)}
                  onPaid={() => { refreshBookings(); setPayBookingId(null); }}
                />
              ))
            )}
          </div>
        )}

        {tab === "quotations" && (
          <div className="space-y-3">
            {quotations.length === 0 ? (
              <div className="glass-panel rounded-lg p-8 text-center" style={{ color: "rgba(246,239,224,.62)" }}>
                No saved quotations. Build one from the packages page.
              </div>
            ) : (
              quotations.map((q) => (
                <div key={q.id} className="glass-panel rounded-lg p-5 flex items-center justify-between">
                  <div>
                    <div className="font-display text-[1.1rem]" style={{ color: "var(--ivory)" }}>{q.package?.name || "Custom"}</div>
                    <div className="text-sm" style={{ color: "rgba(246,239,224,.62)" }}>{q.guests} guests · {fmtDate(q.createdAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-[1.3rem]" style={{ color: "var(--gold-bright)" }}>{fmtMoney(q.total)}</div>
                    <button onClick={() => { openMenuBuilder(q.package?.slug || ""); }} className="text-xs font-semibold" style={{ color: "var(--gold)" }}>
                      Resume →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "notifications" && (
          <div className="glass-panel rounded-lg p-6">
            <h3 className="font-display text-[1.4rem] mb-4" style={{ color: "var(--ivory)" }}>Recent notifications</h3>
            <div className="space-y-3">
              {bookings.slice(0, 5).map((b) => (
                <div key={b.id} className="p-4 rounded-md flex items-start gap-3" style={{ background: "rgba(198,152,58,.06)", border: "1px solid var(--paper-line)" }}>
                  <Bell className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--gold)" }} />
                  <div className="flex-1">
                    <div className="font-medium" style={{ color: "var(--ivory)" }}>Booking {b.bookingRef} {b.status}</div>
                    <div className="text-sm" style={{ color: "rgba(246,239,224,.62)" }}>{b.package?.name} · {fmtDate(b.eventDate)}</div>
                  </div>
                </div>
              ))}
              {bookings.length === 0 && (
                <div className="text-center py-6" style={{ color: "rgba(246,239,224,.62)" }}>No notifications yet.</div>
              )}
            </div>
          </div>
        )}

        {tab === "profile" && (
          <div className="glass-panel rounded-lg p-6 max-w-[600px]">
            <h3 className="font-display text-[1.4rem] mb-4" style={{ color: "var(--ivory)" }}>Your profile</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-md" style={{ background: "rgba(198,152,58,.06)", border: "1px solid var(--paper-line)" }}>
                <Mail className="w-4 h-4" style={{ color: "var(--gold)" }} />
                <div>
                  <div className="text-[0.7rem] tracking-[0.14em] uppercase" style={{ color: "rgba(246,239,224,.62)" }}>Email</div>
                  <div style={{ color: "var(--ivory)" }}>{user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md" style={{ background: "rgba(198,152,58,.06)", border: "1px solid var(--paper-line)" }}>
                <Phone className="w-4 h-4" style={{ color: "var(--gold)" }} />
                <div>
                  <div className="text-[0.7rem] tracking-[0.14em] uppercase" style={{ color: "rgba(246,239,224,.62)" }}>Phone</div>
                  <div style={{ color: "var(--ivory)" }}>{user.phone || "Not provided"}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md" style={{ background: "rgba(198,152,58,.06)", border: "1px solid var(--paper-line)" }}>
                <MapPin className="w-4 h-4" style={{ color: "var(--gold)" }} />
                <div>
                  <div className="text-[0.7rem] tracking-[0.14em] uppercase" style={{ color: "rgba(246,239,224,.62)" }}>City</div>
                  <div style={{ color: "var(--ivory)" }}>{user.city || "Not provided"}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({ b, fmtDate, fmtMoney, statusColor, expanded, onToggle, onEdit, payOpen, onPayToggle, onPaid }: {
  b: Booking;
  fmtDate: (s: string) => string;
  fmtMoney: (n: number) => string;
  statusColor: (s: string) => { bg: string; color: string };
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  payOpen: boolean;
  onPayToggle: () => void;
  onPaid: () => void;
}) {
  const { setToast } = useApp();
  const days = daysUntilEvent(b.eventDate);
  const canEdit = canEditBooking(b.eventDate, b.status);
  const cutoff = editCutoffDate(b.eventDate);
  const addons = parseJson<unknown[]>(b.addonsSnapshot, []);
  const steps = buildBookingNextSteps({
    eventDate: b.eventDate,
    status: b.status,
    balance: b.balance,
    hasAddons: addons.length > 0,
  });
  // Prefer live math — stored `balance` can go stale after promo edits
  const owedPaise = Math.max(0, (b.total || 0) - (b.advancePaid || 0));
  const balanceRupees = Math.max(0, Math.round(owedPaise / 100));
  const suggested = Math.max(
    1,
    Math.min(balanceRupees, Math.round((b.total || 0) * (CONFIG.advancePercent / 100) / 100) || 1)
  );
  const pendingUpi = (b.payments || []).some((p) => p.status === "pending" && p.method === "upi");
  const showPay = balanceRupees > 0 && b.status !== "cancelled" && b.status !== "completed";

  return (
    <div className="glossy-card rounded-lg p-5 mb-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="font-display text-[1.2rem]" style={{ color: "var(--ivory)" }}>{b.package?.name || "Custom"}</span>
            <span className="px-2.5 py-0.5 rounded-full text-[0.72rem] font-bold uppercase tracking-wider" style={statusColor(b.status)}>{b.status}</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm" style={{ color: "rgba(246,239,224,.62)" }}>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {fmtDate(b.eventDate)}</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {b.guests} guests</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {b.venue}, {b.city}</span>
          </div>
          <div className="text-xs mt-2 font-mono" style={{ color: "var(--gold)" }}>Ref: {b.bookingRef}</div>
          {canEdit ? (
            <div className="text-[0.72rem] mt-1" style={{ color: "#7dba9a" }}>
              Editable until {fmtShortDate(cutoff)} · {days} days to event
            </div>
          ) : b.status !== "cancelled" && b.status !== "completed" ? (
            <div className="text-[0.72rem] mt-1" style={{ color: "var(--anaar-bright)" }}>
              Edit window closed — call {CONFIG.phoneDisplay} for kitchen changes
            </div>
          ) : null}
          {pendingUpi && (
            <div className="text-[0.72rem] mt-1" style={{ color: "var(--gold)" }}>
              UPI payment claim pending admin confirmation
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="font-display text-[1.4rem]" style={{ color: "var(--gold-bright)" }}>{fmtMoney(b.total)}</div>
          <div className="text-xs" style={{ color: "rgba(246,239,224,.62)" }}>
            Paid: {fmtMoney(b.advancePaid)} · Balance: {fmtMoney(owedPaise)}
          </div>
          <div className="flex gap-1 mt-2 justify-end flex-wrap">
            {showPay && (
              <button onClick={onPayToggle} className="glossy-btn-gold px-2 py-1 rounded text-[0.66rem] font-semibold inline-flex items-center gap-1">
                <Wallet className="w-3 h-3" /> {payOpen ? "Hide pay" : "Pay now"}
              </button>
            )}
            <button onClick={() => window.open(`/api/quotation-pdf?bookingId=${b.id}`, "_blank")} className="glossy-btn-gold px-2 py-1 rounded text-[0.66rem] font-semibold">
              Quotation PDF
            </button>
            {canEdit && (
              <button onClick={onEdit} className="glossy-btn-ghost px-2 py-1 rounded text-[0.66rem] font-semibold inline-flex items-center gap-1">
                <Pencil className="w-3 h-3" /> Edit menu
              </button>
            )}
            <button onClick={onToggle} className="px-2 py-1 rounded text-[0.66rem] font-semibold" style={{ color: "var(--gold-bright)", border: "1px solid var(--paper-line)" }}>
              {expanded ? "Hide plan" : "Next steps"}
            </button>
          </div>
        </div>
      </div>

      {showPay && b.advancePaid === 0 && (
        <div
          className="mt-4 p-4 rounded-md"
          style={{ background: "rgba(198,152,58,.12)", border: "2px solid rgba(198,152,58,.45)" }}
        >
          <div className="font-display text-[1.1rem] mb-2" style={{ color: "var(--ivory)" }}>
            Offer / promo code
          </div>
          <PromoCodeInput
            theme="dark"
            mode="subtotal"
            totalRupees={Math.round(((b.subtotal || 0) + (b.discount || 0)) / 100) || Math.round(b.total / 100 / 1.05)}
            appliedCode={b.promoCode?.code || null}
            appliedDiscountRupees={b.discount ? Math.round(b.discount / 100) : undefined}
            onToast={setToast}
            onApplied={async (info) => {
              if (!info) {
                const r = await fetch("/api/bookings/promo", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ bookingId: b.id, clear: true }),
                });
                const d = await r.json();
                if (!r.ok) setToast(d.error || "Could not remove promo");
                else onPaid();
                return;
              }
              const r = await fetch("/api/bookings/promo", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId: b.id, code: info.code }),
              });
              const d = await r.json();
              if (!r.ok) setToast(d.error || "Could not apply promo");
              else {
                setToast(`Promo ${info.code} applied`);
                onPaid();
              }
            }}
          />
        </div>
      )}

      {showPay && (
        <div className="mt-4">
          {!payOpen ? (
            <button
              type="button"
              onClick={onPayToggle}
              className="w-full glossy-btn-gold py-3.5 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <Wallet className="w-4 h-4" /> Pay now — balance ₹{balanceRupees.toLocaleString("en-IN")}
            </button>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={onPayToggle}
                className="text-xs font-semibold underline"
                style={{ color: "var(--gold)" }}
              >
                Hide payment options
              </button>
              <PayBookingPanel
                bookingId={b.id}
                bookingRef={b.bookingRef}
                defaultAmountRupees={Math.min(suggested, balanceRupees)}
                maxAmountRupees={balanceRupees}
                theme="dark"
                allowPromo={b.advancePaid === 0}
                appliedPromoCode={b.promoCode?.code || null}
                appliedPromoDiscountRupees={b.discount ? Math.round(b.discount / 100) : undefined}
                onToast={setToast}
                onBookingUpdated={onPaid}
                onPaid={onPaid}
              />
            </div>
          )}
        </div>
      )}

      {/* Payments always visible when linked to this order */}
      <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--paper-line)" }}>
        <PaymentHistory
          theme="dark"
          title={`Payments for order ${b.bookingRef}`}
          payments={(b.payments || []).map((p) => ({
            id: p.id,
            amount: p.amount,
            method: p.method,
            status: p.status,
            gateway: p.gateway || "mock",
            note: p.note,
            proofUrl: p.proofUrl,
            createdAt: p.createdAt || new Date().toISOString(),
            confirmedAt: p.confirmedAt,
          }))}
        />
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: "var(--paper-line)" }}>
          <div className="text-[0.68rem] tracking-[0.2em] uppercase font-semibold mb-2" style={{ color: "var(--gold)" }}>Your path to the event</div>
          {steps.map((s) => (
            <div key={s.id} className="flex gap-3 p-3 rounded-md" style={{ background: "rgba(246,239,224,.04)", border: "1px solid var(--paper-line)" }}>
              {s.done ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#7dba9a" }} />
              ) : s.locked ? (
                <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--anaar-bright)" }} />
              ) : (
                <span className="w-4 h-4 mt-0.5 rounded-full border flex-shrink-0" style={{ borderColor: "var(--gold)" }} />
              )}
              <div className="flex-1">
                <div className="font-medium text-sm" style={{ color: "var(--ivory)" }}>{s.title}</div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(246,239,224,.55)" }}>{s.detail}</div>
                {s.cta && canEdit && (
                  <button type="button" onClick={onEdit} className="text-xs font-semibold mt-1" style={{ color: "var(--gold-bright)" }}>
                    {s.cta} →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
