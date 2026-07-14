"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/store/app-store";
import { Percent, RefreshCw, Tag } from "lucide-react";

interface Promo {
  id: string;
  code: string;
  label: string;
  type: string;
  value: number;
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
}

const emptyForm = {
  code: "",
  label: "",
  type: "percent" as "percent" | "fixed",
  value: "10",
  minOrderRupees: "",
  maxDiscountRupees: "",
  startsAt: "",
  endsAt: "",
  usageLimit: "",
};

export default function AdminPromos() {
  const { setToast } = useApp();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/promos");
      const d = await r.json();
      if (r.ok) setPromos(d.promos || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/admin/promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          label: form.label,
          type: form.type,
          value: Number(form.value),
          minOrderRupees: form.minOrderRupees || 0,
          maxDiscountRupees: form.maxDiscountRupees || null,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
          usageLimit: form.usageLimit || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Create failed");
      setToast(`Promo ${d.promo.code} created`);
      setForm(emptyForm);
      void load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (p: Promo) => {
    const r = await fetch("/api/admin/promos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, isActive: !p.isActive }),
    });
    const d = await r.json();
    if (!r.ok) {
      setToast(d.error || "Update failed");
      return;
    }
    setToast(p.isActive ? "Deactivated" : "Activated");
    void load();
  };

  const inputStyle = {
    background: "rgba(28,16,27,.5)",
    border: "1px solid var(--paper-line)",
    color: "var(--ivory)",
  } as const;

  const valueDisplay = (p: Promo) =>
    p.type === "percent"
      ? `${p.value}%`
      : `₹${(p.value / 100).toLocaleString("en-IN")}`;

  return (
    <div>
      <div className="mb-6">
        <div className="text-[0.72rem] tracking-[0.32em] uppercase mb-1" style={{ color: "var(--gold)" }}>
          Marketing
        </div>
        <h1 className="font-display text-[2rem]" style={{ color: "var(--ivory)" }}>
          Offers & promo codes
        </h1>
        <p className="text-sm mt-2 max-w-xl" style={{ color: "rgba(246,239,224,.62)" }}>
          Team creates codes; customers apply them at final checkout. Demo seeds:{" "}
          <span style={{ color: "var(--gold-bright)" }}>RASA10</span> (10%) ·{" "}
          <span style={{ color: "var(--gold-bright)" }}>FLAT5K</span> (₹5,000 off).
        </p>
      </div>

      <form onSubmit={create} className="glass-panel rounded-lg p-5 mb-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-2 mb-1">
          <Tag className="w-4 h-4" style={{ color: "var(--gold-bright)" }} />
          <span className="font-medium text-sm" style={{ color: "var(--ivory)" }}>
            Create promo
          </span>
        </div>
        <input
          required
          placeholder="Code (e.g. RASA10)"
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
          className="rounded-md px-3 py-2 text-sm font-mono"
          style={inputStyle}
        />
        <input
          required
          placeholder="Label / offer name"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          className="rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "percent" | "fixed" }))}
          className="rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        >
          <option value="percent">Percent %</option>
          <option value="fixed">Fixed ₹</option>
        </select>
        <input
          required
          type="number"
          min={1}
          placeholder={form.type === "percent" ? "Percent e.g. 10" : "Rupees e.g. 5000"}
          value={form.value}
          onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
          className="rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
        <input
          type="number"
          min={0}
          placeholder="Min order ₹ (optional)"
          value={form.minOrderRupees}
          onChange={(e) => setForm((f) => ({ ...f, minOrderRupees: e.target.value }))}
          className="rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
        <input
          type="number"
          min={0}
          placeholder="Max discount ₹ (optional)"
          value={form.maxDiscountRupees}
          onChange={(e) => setForm((f) => ({ ...f, maxDiscountRupees: e.target.value }))}
          className="rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
        <input
          type="date"
          value={form.startsAt}
          onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
          className="rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
        <input
          type="date"
          value={form.endsAt}
          onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
          className="rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
        <input
          type="number"
          min={1}
          placeholder="Usage limit (optional)"
          value={form.usageLimit}
          onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
          className="rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
        <button type="submit" disabled={saving} className="glossy-btn-gold rounded-md py-2 text-sm font-semibold disabled:opacity-60">
          {saving ? "Saving…" : "Create promo"}
        </button>
      </form>

      <div className="flex justify-between items-center mb-3">
        <h3 className="font-display text-[1.2rem]" style={{ color: "var(--ivory)" }}>
          Active catalog
        </h3>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded"
          style={{ color: "var(--gold-bright)", border: "1px solid var(--paper-line)" }}
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8" style={{ color: "rgba(246,239,224,.62)" }}>
          Loading…
        </div>
      ) : promos.length === 0 ? (
        <div className="glass-panel rounded-lg p-8 text-center" style={{ color: "rgba(246,239,224,.62)" }}>
          No promos yet. Create one above or run <code className="text-xs">node scripts/seed-promos-demo.js</code>
        </div>
      ) : (
        <div className="space-y-2">
          {promos.map((p) => (
            <div key={p.id} className="glass-panel rounded-lg p-4 flex flex-wrap justify-between gap-3">
              <div>
                <div className="font-mono font-semibold" style={{ color: "var(--gold-bright)" }}>
                  {p.code}{" "}
                  <span className="font-sans font-normal text-sm" style={{ color: "var(--ivory)" }}>
                    · {p.label}
                  </span>
                </div>
                <div className="text-xs mt-1 flex items-center gap-2" style={{ color: "rgba(246,239,224,.62)" }}>
                  <Percent className="w-3 h-3" /> {valueDisplay(p)} · used {p.usedCount}
                  {p.usageLimit != null ? ` / ${p.usageLimit}` : ""}
                  {p.minOrderPaise > 0 ? ` · min ₹${(p.minOrderPaise / 100).toLocaleString("en-IN")}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void toggle(p)}
                className="px-3 py-1.5 rounded text-xs font-semibold"
                style={{
                  background: p.isActive ? "rgba(31,122,92,.2)" : "rgba(156,42,56,.2)",
                  color: p.isActive ? "#7dba9a" : "var(--anaar-bright)",
                }}
              >
                {p.isActive ? "Active — click to deactivate" : "Inactive — click to activate"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
