"use client";
import { useCallback, useEffect, useState } from "react";
import { CreditCard, QrCode, Upload } from "lucide-react";
import PromoCodeInput from "@/components/rasa/promo-code-input";

type Methods = {
  stripeConfigured: boolean;
  stripeLive?: boolean;
  stripeDemo?: boolean;
  paymentsEnabled: boolean;
  upiId: string | null;
  upiQrUrl: string | null;
};

type Props = {
  bookingId: string;
  bookingRef?: string;
  /** Balance or suggested amount in rupees */
  defaultAmountRupees: number;
  maxAmountRupees: number;
  /** Allow promo when nothing paid yet */
  allowPromo?: boolean;
  appliedPromoCode?: string | null;
  appliedPromoDiscountRupees?: number;
  /** Light theme (wizard) vs dark (account) */
  theme?: "light" | "dark";
  onPaid?: (info: { amountRupees: number; method: "stripe" | "upi" }) => void;
  onToast?: (msg: string) => void;
  /** After promo applied/removed — parent should refresh booking totals */
  onBookingUpdated?: () => void;
};

export default function PayBookingPanel({
  bookingId,
  bookingRef,
  defaultAmountRupees,
  maxAmountRupees,
  allowPromo = true,
  appliedPromoCode,
  appliedPromoDiscountRupees,
  theme = "dark",
  onPaid,
  onToast,
  onBookingUpdated,
}: Props) {
  const [methods, setMethods] = useState<Methods | null>(null);
  const [methodsLoaded, setMethodsLoaded] = useState(false);
  const [amount, setAmount] = useState(Math.max(1, Math.round(defaultAmountRupees)));
  const [note, setNote] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [busy, setBusy] = useState<"stripe" | "upi" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  const toast = onToast || (() => {});

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/payments/methods", { credentials: "include" });
      if (r.ok) setMethods(await r.json());
      else setErr("Could not load payment methods");
    } catch {
      setErr("Could not load payment methods");
    } finally {
      setMethodsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setAmount(Math.max(1, Math.min(Math.round(defaultAmountRupees), Math.round(maxAmountRupees)) || 1));
  }, [defaultAmountRupees, maxAmountRupees]);

  if (maxAmountRupees < 1) {
    return (
      <div className="text-sm text-center py-3" style={{ color: theme === "light" ? "var(--on-ivory-dim)" : "rgba(246,239,224,.62)" }}>
        This booking is fully paid.
      </div>
    );
  }

  const light = theme === "light";
  const panelStyle = light
    ? { background: "#fff", border: "1px solid rgba(58,39,51,.12)", color: "#2c1a26" }
    : { background: "rgba(198,152,58,.06)", border: "1px solid var(--paper-line)", color: "var(--ivory)" };
  const muted = light ? "var(--on-ivory-dim)" : "rgba(246,239,224,.62)";
  const inputStyle = light
    ? { background: "#fff", border: "1px solid rgba(58,39,51,.22)", color: "#2c1a26" }
    : { background: "rgba(28,16,27,.5)", border: "1px solid var(--paper-line)", color: "var(--ivory)" };

  const payStripe = async () => {
    setErr(null);
    setBusy("stripe");
    try {
      const r = await fetch("/api/payments/stripe/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, amountRupees: amount }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Stripe failed");
      if (d.demo) {
        toast(d.message || "Demo card payment recorded");
        onPaid?.({ amountRupees: amount, method: "stripe" });
        return;
      }
      if (d.url) {
        window.location.href = d.url;
        return;
      }
      throw new Error("No Stripe checkout URL");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Stripe failed");
    } finally {
      setBusy(null);
    }
  };

  const payUpi = async () => {
    setErr(null);
    setBusy("upi");
    try {
      const fd = new FormData();
      fd.set("bookingId", bookingId);
      fd.set("amountRupees", String(amount));
      if (note) fd.set("note", note);
      if (proof) fd.set("proof", proof);
      const r = await fetch("/api/payments/upi/claim", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Claim failed");
      setClaimed(true);
      toast("Payment claim submitted — awaiting confirmation");
      onPaid?.({ amountRupees: amount, method: "upi" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Claim failed");
    } finally {
      setBusy(null);
    }
  };

  if (claimed) {
    return (
      <div className="rounded-xl p-5 text-center" style={panelStyle}>
        <div className="font-semibold mb-1">Claim received</div>
        <p className="text-sm" style={{ color: muted }}>
          We will verify your UPI payment and update {bookingRef || "your booking"} shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5 space-y-4" style={panelStyle}>
      <div>
        <div className="font-display text-[1.25rem] mb-1">Pay anytime</div>
        <p className="text-sm" style={{ color: muted }}>
          Pay with Stripe (card) or scan our UPI QR in Paytm / GPay / PhonePe — any amount up to the balance.
        </p>
      </div>

      {allowPromo && (
        <div
          className="rounded-lg p-3 space-y-1"
          style={
            light
              ? { background: "rgba(198,152,58,.12)", border: "1px solid rgba(198,152,58,.4)" }
              : { background: "rgba(198,152,58,.1)", border: "1px solid var(--paper-line)" }
          }
        >
          <div className="font-semibold text-sm mb-1">Offer code before you pay</div>
          <PromoCodeInput
            theme={theme}
            mode="totalWithGst"
            totalRupees={maxAmountRupees + (appliedPromoDiscountRupees || 0)}
            appliedCode={appliedPromoCode || null}
            appliedDiscountRupees={appliedPromoDiscountRupees}
            onToast={toast}
            onApplied={async (info) => {
              try {
                if (!info) {
                  const r = await fetch("/api/bookings/promo", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ bookingId, clear: true }),
                  });
                  const d = await r.json();
                  if (!r.ok) throw new Error(d.error || "Could not remove promo");
                } else {
                  const r = await fetch("/api/bookings/promo", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ bookingId, code: info.code }),
                  });
                  const d = await r.json();
                  if (!r.ok) throw new Error(d.error || "Could not apply promo");
                  toast(`Promo ${info.code} applied`);
                }
                onBookingUpdated?.();
              } catch (e) {
                toast(e instanceof Error ? e.message : "Promo failed");
              }
            }}
          />
        </div>
      )}

      <div>
        <label className="block text-[0.72rem] tracking-[0.12em] uppercase mb-1.5 font-bold" style={{ color: muted }}>
          Amount (₹)
        </label>
        <input
          type="number"
          min={1}
          max={Math.round(maxAmountRupees)}
          value={amount}
          onChange={(e) => setAmount(Math.min(Math.round(maxAmountRupees), Math.max(1, parseInt(e.target.value, 10) || 1)))}
          className="w-full rounded-lg px-3 py-2.5 text-sm"
          style={inputStyle}
        />
        <div className="flex gap-2 mt-2 flex-wrap">
          <button
            type="button"
            className="text-xs px-2 py-1 rounded"
            style={{ border: "1px solid currentColor", opacity: 0.8 }}
            onClick={() => setAmount(Math.round(defaultAmountRupees) || 1)}
          >
            Suggested ₹{Math.round(defaultAmountRupees).toLocaleString("en-IN")}
          </button>
          <button
            type="button"
            className="text-xs px-2 py-1 rounded"
            style={{ border: "1px solid currentColor", opacity: 0.8 }}
            onClick={() => setAmount(Math.round(maxAmountRupees))}
          >
            Full balance ₹{Math.round(maxAmountRupees).toLocaleString("en-IN")}
          </button>
        </div>
      </div>

      {!methodsLoaded && (
        <p className="text-sm text-center" style={{ color: muted }}>
          Loading payment options…
        </p>
      )}

      {methodsLoaded && methods?.stripeConfigured && (
        <div className="space-y-1">
          <button
            type="button"
            disabled={!!busy || methods.paymentsEnabled === false}
            onClick={() => void payStripe()}
            className="w-full glossy-btn-gold py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <CreditCard className="w-4 h-4" />
            {busy === "stripe"
              ? "Processing…"
              : methods.stripeDemo
                ? `Pay ₹${amount.toLocaleString("en-IN")} with card (demo)`
                : `Pay ₹${amount.toLocaleString("en-IN")} with Stripe`}
          </button>
          {methods.stripeDemo && (
            <p className="text-[0.72rem] text-center" style={{ color: muted }}>
              Demo mode — no Stripe keys in `.env` yet. Live Checkout needs `STRIPE_SECRET_KEY`.
            </p>
          )}
        </div>
      )}

      {methodsLoaded && (methods?.upiQrUrl || methods?.upiId) && (
        <div className="rounded-lg p-4 space-y-3" style={light ? { background: "rgba(47,30,47,.05)" } : { background: "rgba(0,0,0,.2)" }}>
          <div className="flex items-center gap-2 font-semibold text-sm">
            <QrCode className="w-4 h-4" /> UPI — Paytm / GPay / PhonePe
          </div>
          {methods.upiQrUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={methods.upiQrUrl} alt="UPI QR" className="mx-auto max-w-[220px] w-full rounded-md bg-white p-2" />
          )}
          {methods.upiId && (
            <div className="text-center text-sm">
              UPI ID: <b className="font-mono">{methods.upiId}</b>
            </div>
          )}
          <input
            placeholder="UTR / transaction note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={inputStyle}
          />
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: muted }}>
            <Upload className="w-4 h-4" />
            <span>{proof ? proof.name : "Upload payment screenshot (optional)"}</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setProof(e.target.files?.[0] || null)}
            />
          </label>
          <button
            type="button"
            disabled={!!busy || methods.paymentsEnabled === false}
            onClick={() => void payUpi()}
            className="w-full py-3 rounded-lg font-semibold disabled:opacity-60"
            style={
              light
                ? { background: "#2f1e2f", color: "#F6EFE0" }
                : { background: "rgba(198,152,58,.2)", color: "var(--gold-bright)", border: "1px solid var(--paper-line)" }
            }
          >
            {busy === "upi" ? "Submitting…" : `I paid ₹${amount.toLocaleString("en-IN")} — submit claim`}
          </button>
        </div>
      )}

      {methodsLoaded && methods && !methods.stripeConfigured && !methods.upiQrUrl && !methods.upiId && (
        <p className="text-sm text-center" style={{ color: muted }}>
          Online payments are not set up yet. Call us or use WhatsApp — your booking is already confirmed.
        </p>
      )}

      {err && (
        <div className="text-sm font-semibold text-center" style={{ color: "var(--anaar-bright, #c44)" }}>
          {err}
        </div>
      )}
    </div>
  );
}
