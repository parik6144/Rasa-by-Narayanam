"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/store/app-store";
import { ROLE_LABELS, staffRoleOptions, type StaffRole } from "@/lib/permissions";
import { UserPlus, RefreshCw } from "lucide-react";

interface StaffRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
}

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "sales" as StaffRole,
};

export default function AdminTeam() {
  const { setToast, user } = useApp();
  const [team, setTeam] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [resetPw, setResetPw] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/team");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load team");
      setTeam(d.team || []);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }, [setToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Create failed");
      setToast(`Created ${d.user.email}`);
      setForm(EMPTY_FORM);
      void load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>, okMsg: string) => {
    const r = await fetch("/api/admin/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const d = await r.json();
    if (!r.ok) {
      setToast(d.error || "Update failed");
      return;
    }
    setToast(okMsg);
    void load();
  };

  const inputStyle = {
    background: "rgba(28,16,27,.5)",
    border: "1px solid var(--paper-line)",
    color: "var(--ivory)",
  } as const;

  return (
    <div>
      <div className="mb-6">
        <div className="text-[0.72rem] tracking-[0.32em] uppercase mb-1" style={{ color: "var(--gold)" }}>
          Access
        </div>
        <h1 className="font-display text-[2rem]" style={{ color: "var(--ivory)" }}>
          Team
        </h1>
        <p className="text-sm mt-2 max-w-xl" style={{ color: "rgba(246,239,224,.62)" }}>
          Create staff logins and assign roles. Seeded IDs:{" "}
          <span style={{ color: "var(--gold-bright)" }}>admin@rasakitchen.co</span> / admin123 ·{" "}
          <span style={{ color: "var(--gold-bright)" }}>manager@rasakitchen.co</span> / manager123 ·{" "}
          <span style={{ color: "var(--gold-bright)" }}>sales@rasakitchen.co</span> / sales123
        </p>
      </div>

      <form onSubmit={create} className="glass-panel rounded-lg p-5 mb-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-2 mb-1">
          <UserPlus className="w-4 h-4" style={{ color: "var(--gold-bright)" }} />
          <span className="font-medium text-sm" style={{ color: "var(--ivory)" }}>
            Add staff member
          </span>
        </div>
        <input
          required
          placeholder="Full name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
        <input
          required
          type="password"
          placeholder="Password (min 6)"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          className="rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        />
        <select
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))}
          className="rounded-md px-3 py-2 text-sm"
          style={inputStyle}
        >
          {staffRoleOptions().map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={saving}
          className="glossy-btn-gold rounded-md py-2 text-sm font-semibold disabled:opacity-60"
        >
          {saving ? "Creating…" : "Create user"}
        </button>
      </form>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-[1.2rem]" style={{ color: "var(--ivory)" }}>
          Staff accounts
        </h3>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md"
          style={{ color: "var(--gold-bright)", border: "1px solid var(--paper-line)" }}
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8" style={{ color: "rgba(246,239,224,.62)" }}>
          Loading…
        </div>
      ) : (
        <div className="space-y-3">
          {team.map((m) => (
            <div key={m.id} className="glass-panel rounded-lg p-4">
              <div className="flex flex-wrap gap-4 justify-between">
                <div>
                  <div className="font-medium" style={{ color: "var(--ivory)" }}>
                    {m.name || "—"}{" "}
                    <span
                      className="ml-2 text-[0.66rem] uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        background: m.isActive ? "rgba(31,122,92,.2)" : "rgba(156,42,56,.2)",
                        color: m.isActive ? "#1f7a5c" : "var(--anaar-bright)",
                      }}
                    >
                      {m.isActive ? "active" : "inactive"}
                    </span>
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: "rgba(246,239,224,.62)" }}>
                    {m.email}
                    {m.phone ? ` · ${m.phone}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={m.role}
                    disabled={m.id === user?.id}
                    onChange={(e) =>
                      void patch(m.id, { role: e.target.value }, `Role → ${ROLE_LABELS[e.target.value as StaffRole]}`)
                    }
                    className="px-2 py-1 rounded text-xs"
                    style={inputStyle}
                  >
                    {staffRoleOptions().map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="password"
                    placeholder="New password"
                    value={resetPw[m.id] || ""}
                    onChange={(e) => setResetPw((p) => ({ ...p, [m.id]: e.target.value }))}
                    className="px-2 py-1 rounded text-xs w-28"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    className="px-2 py-1 rounded text-xs font-semibold"
                    style={{ color: "var(--gold-bright)", border: "1px solid var(--paper-line)" }}
                    onClick={() => {
                      const pw = resetPw[m.id];
                      if (!pw || pw.length < 6) {
                        setToast("Password min 6 characters");
                        return;
                      }
                      void patch(m.id, { password: pw }, "Password updated").then(() =>
                        setResetPw((p) => ({ ...p, [m.id]: "" }))
                      );
                    }}
                  >
                    Reset PW
                  </button>
                  {m.id !== user?.id && (
                    <button
                      type="button"
                      className="px-2 py-1 rounded text-xs font-semibold"
                      style={{
                        color: m.isActive ? "var(--anaar-bright)" : "#1f7a5c",
                        border: "1px solid var(--paper-line)",
                      }}
                      onClick={() =>
                        void patch(
                          m.id,
                          { isActive: !m.isActive },
                          m.isActive ? "Deactivated" : "Reactivated"
                        )
                      }
                    >
                      {m.isActive ? "Deactivate" : "Reactivate"}
                    </button>
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
