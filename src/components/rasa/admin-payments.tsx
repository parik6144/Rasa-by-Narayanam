"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/store/app-store";
import { hasPermission } from "@/lib/permissions";
import { IndianRupee, RefreshCw, Check, X } from "lucide-react";

interface PaymentRow {
  id: string;
  amount: number;
  method: string;
  status: string;
  gateway: string;
  proofUrl: string | null;
  note: string | null;
  createdAt: string;
  user: { name: string | null; email: string; phone: string | null };
  booking: { id: string; bookingRef: string; balance: number; advancePaid: number; total: number };
}

export default function AdminPayments() {
  const { user, setToast } = useApp();
  const canManage = hasPermission(user?.role, "payments.manage");
  const canApprove = hasPermission(user?.role, "payments.approve");
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [upiId, setUpiId] = useState("");
  const [upiQrUrl, setUpiQrUrl] = useState<string | null>(null);
  const [paymentsEnabled, setPaymentsEnabled] = useState(true);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/payments?status=${filter}`);
      const d = await r.json();
      if (r.ok) setPayments(d.payments || []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const loadSettings = useCallback(async () => {
    const r = await fetch("/api/admin/payments/settings");
    if (!r.ok) return;
    const d = await r.json();
    setUpiId(d.settings?.upiId || "");
    setUpiQrUrl(d.settings?.upiQrUrl || null);
    setPaymentsEnabled(d.settings?.paymentsEnabled !== false);
  }, []);

  useEffect(() => {
    void loadPayments();
    void loadSettings();
  }, [loadPayments, loadSettings]);

  const saveSettings = async () => {
    if (!canManage) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("upiId", upiId);
      fd.set("paymentsEnabled", paymentsEnabled ? "true" : "false");
      if (qrFile) fd.set("qr", qrFile);
      const r = await fetch("/api/admin/payments/settings", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save failed");
      setUpiQrUrl(d.settings?.upiQrUrl || null);
      setQrFile(null);
      setToast("Payment settings saved");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const act = async (id: string, action: "approve" | "reject") => {
    const r = await fetch("/api/admin/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const d = await r.json();
    if (!r.ok) {
      setToast(d.error || "Failed");
      return;
    }
    setToast(action === "approve" ? "Payment approved" : "Payment rejected");
    void loadPayments();
  };

  const fmt = (paise: number) => "₹" + (paise / 100).toLocaleString("en-IN");

  return (
    <div>
      <div className="mb-6">
        <div className="text-[0.72rem] tracking-[0.32em] uppercase mb-1" style={{ color: "var(--gold)" }}>
          Finance
        </div>
        <h1 className="font-display text-[2rem]" style={{ color: "var(--ivory)" }}>
          Payments
        </h1>
        <p className="text-sm mt-2" style={{ color: "rgba(246,239,224,.62)" }}>
          Each row is linked to an order (booking ref) and party. Stripe auto-confirms; UPI claims need Approve.
          Open <b style={{ color: "var(--gold-bright)" }}>Bookings → Payment log</b> to see a party&apos;s full payment trail.
        </p>
      </div>

      {canManage && (
        <div className="glass-panel rounded-lg p-5 mb-6 space-y-3">
          <div className="flex items-center gap-2 font-medium" style={{ color: "var(--ivory)" }}>
            <IndianRupee className="w-4 h-4" style={{ color: "var(--gold-bright)" }} />
            UPI QR settings (admin)
          </div>
          <p className="text-xs" style={{ color: "rgba(246,239,224,.55)" }}>
            This QR / UPI ID is what customers see on Pay now (booking success + My Bookings).
          </p>
          <input
            placeholder="UPI ID e.g. rasa@paytm"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            className="w-full rounded-md px-3 py-2 text-sm"
            style={{ background: "rgba(28,16,27,.5)", border: "1px solid var(--paper-line)", color: "var(--ivory)" }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm cursor-pointer" style={{ color: "rgba(246,239,224,.62)" }}>
              Upload QR image
              <input type="file" accept="image/*" className="ml-2 text-xs" onChange={(e) => setQrFile(e.target.files?.[0] || null)} />
            </label>
            <label className="text-sm flex items-center gap-2" style={{ color: "var(--ivory)" }}>
              <input type="checkbox" checked={paymentsEnabled} onChange={(e) => setPaymentsEnabled(e.target.checked)} />
              Payments enabled
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveSettings()}
              className="glossy-btn-gold px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
          {upiQrUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={upiQrUrl} alt="Current UPI QR" className="max-w-[160px] rounded bg-white p-2" />
          )}
          {qrFile && <div className="text-xs" style={{ color: "var(--gold)" }}>New file selected: {qrFile.name}</div>}
        </div>
      )}

      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex gap-2">
          {["pending", "success", "all"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider"
              style={
                filter === f
                  ? { background: "rgba(198,152,58,.2)", color: "var(--gold-bright)" }
                  : { color: "rgba(246,239,224,.62)", border: "1px solid var(--paper-line)" }
              }
            >
              {f}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void loadPayments()}
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
      ) : payments.length === 0 ? (
        <div className="glass-panel rounded-lg p-8 text-center" style={{ color: "rgba(246,239,224,.62)" }}>
          No payments in this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div key={p.id} className="glass-panel rounded-lg p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <div className="font-medium" style={{ color: "var(--ivory)" }}>
                    {fmt(p.amount)} · {p.gateway} / {p.method}
                    <span
                      className="ml-2 text-[0.66rem] uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        background: p.status === "success" ? "rgba(31,122,92,.2)" : p.status === "pending" ? "rgba(198,152,58,.2)" : "rgba(156,42,56,.2)",
                        color: p.status === "success" ? "#1f7a5c" : p.status === "pending" ? "var(--gold)" : "var(--anaar-bright)",
                      }}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: "rgba(246,239,224,.62)" }}>
                    {p.booking.bookingRef} · {p.user.name || p.user.email}
                    {p.note ? ` · ${p.note}` : ""}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "rgba(246,239,224,.5)" }}>
                    {new Date(p.createdAt).toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.proofUrl && (
                    <a
                      href={p.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 rounded"
                      style={{ color: "var(--gold-bright)", border: "1px solid var(--paper-line)" }}
                    >
                      View proof
                    </a>
                  )}
                  {canApprove && p.status === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => void act(p.id, "approve")}
                        className="px-2 py-1 rounded text-xs font-semibold inline-flex items-center gap-1"
                        style={{ background: "rgba(31,122,92,.25)", color: "#7dba9a" }}
                      >
                        <Check className="w-3 h-3" /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void act(p.id, "reject")}
                        className="px-2 py-1 rounded text-xs font-semibold inline-flex items-center gap-1"
                        style={{ background: "rgba(156,42,56,.2)", color: "var(--anaar-bright)" }}
                      >
                        <X className="w-3 h-3" /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
