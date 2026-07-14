"use client";
import { useState } from "react";
import { Tag } from "lucide-react";
import { CONFIG } from "@/lib/rasa-data";

type Props = {
  /** Pre-GST subtotal in rupees OR gross total — pass mode */
  totalRupees: number;
  mode?: "totalWithGst" | "subtotal";
  theme?: "light" | "dark";
  /** Controlled applied code from parent */
  appliedCode?: string | null;
  appliedDiscountRupees?: number;
  onApplied: (info: {
    code: string;
    discountRupees: number;
    totalRupees: number;
    label: string;
  } | null) => void;
  onToast?: (msg: string) => void;
};

export default function PromoCodeInput({
  totalRupees,
  mode = "totalWithGst",
  theme = "dark",
  appliedCode,
  appliedDiscountRupees,
  onApplied,
  onToast,
}: Props) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const light = theme === "light";
  const muted = light ? "var(--on-ivory-dim)" : "rgba(246,239,224,.62)";
  const inputStyle = light
    ? { background: "#fff", border: "1px solid rgba(58,39,51,.22)", color: "#2c1a26" }
    : { background: "rgba(28,16,27,.5)", border: "1px solid var(--paper-line)", color: "var(--ivory)" };

  const apply = async () => {
    setErr(null);
    setBusy(true);
    try {
      const body =
        mode === "subtotal"
          ? { code, subtotalRupees: totalRupees }
          : { code, totalRupees };
      const r = await fetch("/api/promos/validate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Invalid code");
      onApplied({
        code: d.promo.code,
        discountRupees: d.discountRupees,
        totalRupees: d.totalRupees,
        label: d.promo.label,
      });
      onToast?.(`Promo ${d.promo.code} applied (−₹${d.discountRupees.toLocaleString("en-IN")})`);
      setCode("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: light ? "#2c1a26" : "var(--ivory)" }}>
        <Tag className="w-4 h-4" style={{ color: "var(--gold)" }} /> Have a promo code?
      </div>
      {appliedCode ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg text-sm"
          style={
            light
              ? { background: "rgba(31,122,92,.08)", border: "1px solid rgba(31,122,92,.25)" }
              : { background: "rgba(31,122,92,.15)", border: "1px solid rgba(31,122,92,.35)" }
          }
        >
          <span>
            <b className="font-mono">{appliedCode}</b>
            {appliedDiscountRupees != null && (
              <> − ₹{appliedDiscountRupees.toLocaleString("en-IN")}</>
            )}
          </span>
          <button
            type="button"
            className="text-xs font-semibold underline"
            onClick={() => onApplied(null)}
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter code"
            className="flex-1 rounded-lg px-3 py-2 text-sm font-mono"
            style={inputStyle}
          />
          <button
            type="button"
            disabled={busy || !code.trim()}
            onClick={() => void apply()}
            className="glossy-btn-gold px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
          >
            {busy ? "…" : "Apply"}
          </button>
        </div>
      )}
      {err && (
        <div className="text-xs font-semibold" style={{ color: "var(--anaar-bright, #c44)" }}>
          {err}
        </div>
      )}
      <p className="text-[0.7rem]" style={{ color: muted }}>
        Offer cuts the menu total first; GST {CONFIG.gstPercent}% is then added on what remains.
      </p>
    </div>
  );
}
