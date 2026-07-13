"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { CONFIG } from "@/lib/rasa-data";
import { useApp } from "@/store/app-store";
import {
  Flame, Phone, MessageCircle, Mail, StickyNote, CalendarClock,
  CheckCircle2, XCircle, Clock, Filter, RefreshCw, ChevronDown, ChevronUp,
  Copy, ExternalLink, AlertTriangle, UserRound, Paperclip, FileText, Save, X,
} from "lucide-react";

export type LeadFile = { name: string; url: string; size: number; mime: string; at: string };

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  eventDate: string | null;
  guests: number | null;
  city: string | null;
  venue: string | null;
  occasion: string | null;
  message: string | null;
  packageInterest: string | null;
  priority: string;
  status: string;
  source: string;
  notes: string | null;
  followUps: string | null;
  attachments: string | null;
  lastContactedAt: string | null;
  followUpAt: string | null;
  lostReason: string | null;
  createdAt: string;
  updatedAt: string;
};

type FollowUp = {
  at: string;
  type: string;
  note: string;
  by?: string;
  nextAt?: string | null;
  files?: LeadFile[];
};

type LogForm = {
  type: "call" | "whatsapp" | "visit" | "note" | "update";
  note: string;
  nextAt: string;
  status: string;
  files: LeadFile[];
};

const STATUSES = ["new", "contacted", "quoted", "follow_up", "won", "lost"] as const;
const PRIORITIES = ["urgent", "high", "normal"] as const;

function waDigits(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return "91" + d;
  if (d.startsWith("91") && d.length === 12) return d;
  return d;
}

function parseFollowUps(raw: string | null): FollowUp[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as FollowUp[]; } catch { return []; }
}

function parseFiles(raw: string | null): LeadFile[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as LeadFile[]; } catch { return []; }
}

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function fromPreset(days: number, hour: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return toLocalInput(d.toISOString());
}

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fileSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function buildWaMessage(lead: Lead, kind: "intro" | "quote" | "follow" | "menu") {
  const date = lead.eventDate
    ? new Date(lead.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "your event date";
  const guests = lead.guests ? `${lead.guests} guests` : "your guest count";
  const brand = "Rasa by Narayanam";

  if (kind === "intro") {
    return `Namaste ${lead.name} ji 🙏\n\nThank you for contacting *${brand}*. We received your enquiry${lead.occasion ? ` for your *${lead.occasion}*` : ""}${lead.eventDate ? ` on *${date}*` : ""}.\n\nOur team will help you craft the perfect menu. When is a good time for a quick call?\n\n— ${brand}\n${CONFIG.phoneDisplay}`;
  }
  if (kind === "quote") {
    return `Namaste ${lead.name} ji,\n\nSharing a quick estimate path for your ${lead.occasion || "event"} (${guests}, ${date}).\n\nYou can also browse packages here: ${CONFIG.websiteUrl}\n\nShall I send a detailed quotation on WhatsApp?\n\n— ${brand}`;
  }
  if (kind === "menu") {
    return `Hi ${lead.name} ji,\n\nHere is our package menu overview: ${CONFIG.websiteUrl}\n\nTell us your preferred package / budget and we will lock dishes course-by-course for ${guests}.\n\n— ${brand}`;
  }
  return `Hi ${lead.name} ji,\n\nJust following up on your enquiry with ${brand}${lead.eventDate ? ` for ${date}` : ""}. Would you like us to prepare a custom quotation today?\n\nReply here or call ${CONFIG.phoneDisplay}.\n\n— Team Rasa`;
}

function emptyLog(type: LogForm["type"] = "update", existingNext?: string | null): LogForm {
  return {
    type,
    note: "",
    nextAt: toLocalInput(existingNext) || fromPreset(1, 11),
    status: "",
    files: [],
  };
}

export default function AdminLeads({
  highlightLeadId,
  onEngage,
}: {
  highlightLeadId?: string | null;
  onEngage?: () => void;
}) {
  const { setToast } = useApp();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "new" | "today" | "due" | "urgent" | "won" | "lost">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [logForm, setLogForm] = useState<LogForm>(emptyLog());
  const [lostReason, setLostReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/leads");
    const d = await r.json();
    setLeads(d.leads || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 25000);
    return () => clearInterval(i);
  }, [load]);

  useEffect(() => {
    if (highlightLeadId) {
      setExpanded(highlightLeadId);
      const lead = leads.find((x) => x.id === highlightLeadId);
      setLogForm(emptyLog("update", lead?.followUpAt));
    }
  }, [highlightLeadId, leads]);

  const patch = async (id: string, body: Record<string, unknown>, toastMsg?: string) => {
    setBusy(id);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Update failed");
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...d.lead } : l)));
      if (toastMsg) setToast(toastMsg);
      onEngage?.();
      return d.lead as Lead;
    } catch (e: unknown) {
      setToast(e instanceof Error ? e.message : "Failed");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const openPanel = (lead: Lead, type: LogForm["type"] = "update") => {
    setExpanded(lead.id);
    setLogForm(emptyLog(type, lead.followUpAt));
    setLostReason("");
  };

  const filtered = useMemo(() => {
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    let list = [...leads];
    if (filter === "new") list = list.filter((l) => l.status === "new");
    else if (filter === "today") list = list.filter((l) => new Date(l.createdAt) >= startOfDay);
    else if (filter === "due") {
      list = list.filter((l) => l.followUpAt && new Date(l.followUpAt).getTime() <= now + 24 * 3600 * 1000 && !["won", "lost"].includes(l.status));
    } else if (filter === "urgent") list = list.filter((l) => l.priority === "urgent" || l.priority === "high");
    else if (filter === "won") list = list.filter((l) => l.status === "won");
    else if (filter === "lost") list = list.filter((l) => l.status === "lost");

    list.sort((a, b) => {
      const score = (l: Lead) => {
        let s = 0;
        if (l.status === "new") s += 100;
        if (l.priority === "urgent") s += 50;
        if (l.priority === "high") s += 25;
        if (l.followUpAt && new Date(l.followUpAt).getTime() <= now) s += 80;
        return s;
      };
      const d = score(b) - score(a);
      if (d !== 0) return d;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [leads, filter]);

  const counts = useMemo(() => {
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return {
      all: leads.length,
      new: leads.filter((l) => l.status === "new").length,
      today: leads.filter((l) => new Date(l.createdAt) >= startOfDay).length,
      due: leads.filter((l) => l.followUpAt && new Date(l.followUpAt).getTime() <= now + 24 * 3600 * 1000 && !["won", "lost"].includes(l.status)).length,
      urgent: leads.filter((l) => l.priority === "urgent" || l.priority === "high").length,
      won: leads.filter((l) => l.status === "won").length,
      lost: leads.filter((l) => l.status === "lost").length,
    };
  }, [leads]);

  const openWa = (lead: Lead, kind: "intro" | "quote" | "follow" | "menu") => {
    const msg = buildWaMessage(lead, kind);
    window.open(`https://wa.me/${waDigits(lead.phone)}?text=${encodeURIComponent(msg)}`, "_blank");
    openPanel(lead, "whatsapp");
    setToast("WhatsApp opened — save notes and next follow-up after the chat");
  };

  const startCall = (lead: Lead) => {
    window.location.href = `tel:${lead.phone}`;
    openPanel(lead, "call");
    setToast("Call started — log what was discussed and set the next follow-up");
  };

  const uploadFiles = async (leadId: string, fileList: FileList | null) => {
    if (!fileList?.length) return;
    setUploading(true);
    try {
      const uploaded: LeadFile[] = [];
      for (const file of Array.from(fileList)) {
        const fd = new FormData();
        fd.append("leadId", leadId);
        fd.append("file", file);
        const res = await fetch("/api/admin/leads/upload", { method: "POST", body: fd });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Upload failed");
        uploaded.push(d.file as LeadFile);
      }
      setLogForm((f) => ({ ...f, files: [...f.files, ...uploaded] }));
      setToast(`${uploaded.length} file attached`);
    } catch (e: unknown) {
      setToast(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveUpdate = async (lead: Lead) => {
    if (!logForm.note.trim()) {
      setToast("Please write what was discussed on the call or WhatsApp");
      return;
    }
    if (!logForm.nextAt) {
      setToast("Please set the next follow-up date and time");
      return;
    }
    const body: Record<string, unknown> = {
      followUpAt: logForm.nextAt,
      followUp: {
        type: logForm.type,
        note: logForm.note.trim(),
        nextAt: logForm.nextAt,
        files: logForm.files,
      },
    };
    if (logForm.status) body.status = logForm.status;
    else if (lead.status === "new") body.status = "contacted";
    else body.status = "follow_up";

    const updated = await patch(lead.id, body, "Update saved · next follow-up locked");
    if (updated) setLogForm(emptyLog("update", updated.followUpAt));
  };

  const markLost = async (lead: Lead) => {
    if (!lostReason.trim()) {
      setToast("Add a lost reason");
      return;
    }
    await patch(lead.id, { status: "lost", lostReason: lostReason.trim() }, "Marked lost");
    setLostReason("");
  };

  const copyPhone = (phone: string) => {
    void navigator.clipboard.writeText(phone);
    setToast("Phone copied");
  };

  if (loading) {
    return <div className="text-center py-8" style={{ color: "rgba(246,239,224,.62)" }}>Loading leads…</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[2rem]" style={{ color: "var(--ivory)" }}>Enquiry Leads</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(246,239,224,.55)" }}>
            After a call or WhatsApp, save notes, files, and the next follow-up time — everything stays here for next time
          </p>
        </div>
        <button onClick={() => { setLoading(true); load(); }} className="flex items-center gap-2 px-3 py-2 rounded-md text-xs" style={{ background: "rgba(198,152,58,.12)", color: "var(--gold-bright)", border: "1px solid var(--paper-line)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {([
          ["all", "All", counts.all],
          ["new", "New", counts.new],
          ["today", "Today", counts.today],
          ["due", "Due follow-up", counts.due],
          ["urgent", "Hot", counts.urgent],
          ["won", "Won", counts.won],
          ["lost", "Lost", counts.lost],
        ] as const).map(([id, label, n]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className="px-3 py-1.5 rounded-full text-[0.74rem] font-semibold flex items-center gap-1.5"
            style={filter === id
              ? { background: "rgba(198,152,58,.22)", color: "var(--gold-bright)", border: "1px solid rgba(198,152,58,.45)" }
              : { background: "rgba(246,239,224,.04)", color: "rgba(246,239,224,.62)", border: "1px solid var(--paper-line)" }}
          >
            {id === "urgent" && <Flame className="w-3 h-3" />}
            {id === "due" && <CalendarClock className="w-3 h-3" />}
            {id === "new" && <Filter className="w-3 h-3" />}
            {label}
            <span className="opacity-80">{n}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glossy-card rounded-lg p-8 text-center" style={{ color: "rgba(246,239,224,.62)" }}>
          No leads in this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((l) => {
            const open = expanded === l.id;
            const timeline = parseFollowUps(l.followUps);
            const files = parseFiles(l.attachments);
            const overdue = !!(l.followUpAt && new Date(l.followUpAt).getTime() < Date.now() && !["won", "lost"].includes(l.status));
            const isNew = l.status === "new";
            const lastEntry = timeline[0];

            return (
              <div
                key={l.id}
                className="glossy-card rounded-lg overflow-hidden relative"
                style={{
                  border: isNew ? "1px solid rgba(198,152,58,.45)" : overdue ? "1px solid rgba(156,42,56,.45)" : undefined,
                  boxShadow: highlightLeadId === l.id ? "0 0 0 2px rgba(198,152,58,.5)" : undefined,
                }}
              >
                {(l.priority === "urgent" || l.priority === "high") && (
                  <div
                    className="absolute top-0 right-0 px-3 py-1 rounded-bl-lg text-[0.66rem] font-bold uppercase tracking-wider"
                    style={{
                      background: l.priority === "urgent" ? "var(--anaar)" : "var(--gold)",
                      color: l.priority === "urgent" ? "#fff" : "#231318",
                    }}
                  >
                    {l.priority === "urgent" ? <><Flame className="w-3 h-3 inline mr-1" />Urgent</> : "High"}
                  </div>
                )}

                <div className="p-5">
                  <div className="flex flex-wrap justify-between gap-4">
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {isNew && (
                          <span className="px-2 py-0.5 rounded text-[0.62rem] font-bold uppercase tracking-wider" style={{ background: "rgba(198,152,58,.25)", color: "var(--gold-bright)" }}>NEW</span>
                        )}
                        {overdue && (
                          <span className="px-2 py-0.5 rounded text-[0.62rem] font-bold uppercase tracking-wider flex items-center gap-1" style={{ background: "rgba(156,42,56,.2)", color: "var(--anaar-bright)" }}>
                            <AlertTriangle className="w-3 h-3" /> Follow-up due
                          </span>
                        )}
                        <span className="font-display text-[1.25rem]" style={{ color: "var(--ivory)" }}>{l.name}</span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm" style={{ color: "rgba(246,239,224,.7)" }}>
                        <button type="button" onClick={() => copyPhone(l.phone)} className="inline-flex items-center gap-1" style={{ color: "var(--gold-bright)" }}>
                          <Phone className="w-3.5 h-3.5" /> {l.phone} <Copy className="w-3 h-3 opacity-50" />
                        </button>
                        {l.email && <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {l.email}</span>}
                        {l.occasion && <span>🎉 {l.occasion}</span>}
                        {l.eventDate && <span>📅 {new Date(l.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
                        {l.guests && <span>👥 {l.guests}</span>}
                        {l.city && <span>📍 {l.city}</span>}
                      </div>

                      {l.message && (
                        <div className="text-sm mt-2 p-2.5 rounded" style={{ background: "rgba(198,152,58,.06)", color: "var(--ivory)", border: "1px solid var(--paper-line)" }}>
                          “{l.message}”
                        </div>
                      )}

                      {/* Memory strip — last update + next follow-up */}
                      <div className="mt-3 grid sm:grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-md text-xs" style={{ background: "rgba(246,239,224,.04)", border: "1px solid var(--paper-line)" }}>
                          <div className="uppercase tracking-wider text-[0.62rem] mb-1" style={{ color: "rgba(246,239,224,.45)" }}>Last update</div>
                          {lastEntry ? (
                            <>
                              <div style={{ color: "var(--ivory)" }} className="line-clamp-2">{lastEntry.note || "—"}</div>
                              <div className="mt-1" style={{ color: "rgba(246,239,224,.42)" }}>{lastEntry.type} · {relativeTime(lastEntry.at)}</div>
                            </>
                          ) : (
                            <div style={{ color: "rgba(246,239,224,.42)" }}>No updates yet</div>
                          )}
                        </div>
                        <div className="p-2.5 rounded-md text-xs" style={{
                          background: overdue ? "rgba(156,42,56,.12)" : "rgba(198,152,58,.08)",
                          border: `1px solid ${overdue ? "rgba(156,42,56,.35)" : "var(--paper-line)"}`,
                        }}>
                          <div className="uppercase tracking-wider text-[0.62rem] mb-1 flex items-center gap-1" style={{ color: overdue ? "var(--anaar-bright)" : "var(--gold)" }}>
                            <CalendarClock className="w-3 h-3" /> Next follow-up
                          </div>
                          {l.followUpAt ? (
                            <div className="font-semibold" style={{ color: overdue ? "var(--anaar-bright)" : "var(--ivory)" }}>{fmtWhen(l.followUpAt)}</div>
                          ) : (
                            <div style={{ color: "rgba(246,239,224,.42)" }}>Not set — add it in the update form</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 items-stretch sm:items-end min-w-[140px]">
                      <select
                        value={l.status}
                        disabled={busy === l.id}
                        onChange={(e) => void patch(l.id, { status: e.target.value }, `Status → ${e.target.value}`)}
                        className="px-3 py-1.5 rounded text-xs"
                        style={{ background: "rgba(28,16,27,.8)", border: "1px solid var(--paper-line)", color: "var(--ivory)" }}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                      </select>
                      <select
                        value={l.priority}
                        disabled={busy === l.id}
                        onChange={(e) => void patch(l.id, { priority: e.target.value }, `Priority → ${e.target.value}`)}
                        className="px-3 py-1.5 rounded text-xs"
                        style={{ background: "rgba(28,16,27,.8)", border: "1px solid var(--paper-line)", color: "var(--ivory)" }}
                      >
                        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => (open ? setExpanded(null) : openPanel(l, "update"))}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 rounded text-xs font-semibold"
                        style={{ background: "rgba(198,152,58,.18)", color: "var(--gold-bright)", border: "1px solid rgba(198,152,58,.35)" }}
                      >
                        {open ? <><ChevronUp className="w-3.5 h-3.5" /> Close</> : <><ChevronDown className="w-3.5 h-3.5" /> Log update</>}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4 pt-3" style={{ borderTop: "1px solid var(--paper-line)" }}>
                    <button type="button" onClick={() => startCall(l)} className="glossy-btn-gold px-3 py-1.5 rounded text-xs font-semibold inline-flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> Call + log
                    </button>
                    <button type="button" onClick={() => openWa(l, "intro")} className="glossy-btn-wa px-3 py-1.5 rounded text-xs font-semibold inline-flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5" /> WA + log
                    </button>
                    <button type="button" onClick={() => openWa(l, "follow")} className="px-3 py-1.5 rounded text-xs font-semibold inline-flex items-center gap-1.5" style={{ background: "rgba(37,211,102,.12)", color: "#25D366", border: "1px solid rgba(37,211,102,.35)" }}>
                      WA Follow-up
                    </button>
                    <button type="button" onClick={() => openPanel(l, "update")} className="px-3 py-1.5 rounded text-xs font-semibold inline-flex items-center gap-1.5" style={{ background: "rgba(246,239,224,.06)", color: "var(--ivory)", border: "1px solid var(--paper-line)" }}>
                      <StickyNote className="w-3.5 h-3.5" /> Write update
                    </button>
                    <button
                      type="button"
                      onClick={() => void patch(l.id, { status: "quoted", followUp: { type: "status", note: "Marked quoted" } }, "Marked quoted")}
                      className="px-3 py-1.5 rounded text-xs font-semibold inline-flex items-center gap-1.5"
                      style={{ background: "rgba(246,239,224,.05)", color: "rgba(246,239,224,.75)", border: "1px solid var(--paper-line)" }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Quoted
                    </button>
                    <button
                      type="button"
                      onClick={() => void patch(l.id, { status: "won", followUp: { type: "status", note: "Won / converted" } }, "Lead won 🎉")}
                      className="px-3 py-1.5 rounded text-xs font-semibold inline-flex items-center gap-1.5"
                      style={{ background: "rgba(31,122,92,.18)", color: "#3ecf8e", border: "1px solid rgba(31,122,92,.35)" }}
                    >
                      Won
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="px-5 pb-5 grid lg:grid-cols-2 gap-4" style={{ background: "rgba(0,0,0,.18)" }}>
                    {/* UPDATE FORM */}
                    <div className="space-y-3 pt-3">
                      <div className="text-[0.68rem] tracking-[0.2em] uppercase font-semibold" style={{ color: "var(--gold)" }}>
                        Log follow-up / update
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {([
                          ["call", "Phone call"],
                          ["whatsapp", "WhatsApp"],
                          ["visit", "Visit / meeting"],
                          ["note", "Note only"],
                          ["update", "General update"],
                        ] as const).map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setLogForm((f) => ({ ...f, type: id }))}
                            className="px-2.5 py-1 rounded text-[0.7rem] font-semibold"
                            style={logForm.type === id
                              ? { background: "rgba(198,152,58,.25)", color: "var(--gold-bright)", border: "1px solid rgba(198,152,58,.5)" }
                              : { background: "rgba(246,239,224,.04)", color: "rgba(246,239,224,.65)", border: "1px solid var(--paper-line)" }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="text-xs mb-1 block" style={{ color: "rgba(246,239,224,.7)" }}>
                          What was discussed? (budget, package, date confirm, pending…) *
                        </label>
                        <textarea
                          value={logForm.note}
                          onChange={(e) => setLogForm((f) => ({ ...f, note: e.target.value }))}
                          rows={4}
                          placeholder="Example: Spoke on phone — 300 guests, budget ~₹2L, still deciding menu. Send quote tomorrow at 11am."
                          className="w-full px-3 py-2 rounded-md text-sm"
                          style={{ background: "rgba(28,16,27,.7)", border: "1px solid var(--paper-line)", color: "var(--ivory)" }}
                        />
                      </div>

                      <div>
                        <label className="text-xs mb-1 flex items-center gap-1" style={{ color: "rgba(246,239,224,.7)" }}>
                          <CalendarClock className="w-3.5 h-3.5" /> Next follow-up date & time *
                        </label>
                        <input
                          type="datetime-local"
                          value={logForm.nextAt}
                          onChange={(e) => setLogForm((f) => ({ ...f, nextAt: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-md text-sm"
                          style={{ background: "rgba(28,16,27,.7)", border: "1px solid rgba(198,152,58,.4)", color: "var(--ivory)" }}
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {[
                            ["Today 6pm", 0, 18],
                            ["Tomorrow 11am", 1, 11],
                            ["In 2 days", 2, 11],
                            ["Next week", 7, 11],
                          ].map(([label, days, hour]) => (
                            <button
                              key={String(label)}
                              type="button"
                              className="px-2 py-1 rounded text-[0.66rem]"
                              style={{ background: "rgba(246,239,224,.05)", border: "1px solid var(--paper-line)", color: "rgba(246,239,224,.7)" }}
                              onClick={() => setLogForm((f) => ({ ...f, nextAt: fromPreset(Number(days), Number(hour)) }))}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs mb-1 flex items-center gap-1" style={{ color: "rgba(246,239,224,.7)" }}>
                          <Paperclip className="w-3.5 h-3.5" /> Attach file (quote PDF, menu, photo, Excel…)
                        </label>
                        <input
                          ref={fileRef}
                          type="file"
                          multiple
                          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv,image/*"
                          onChange={(e) => void uploadFiles(l.id, e.target.files)}
                          className="block w-full text-xs"
                          style={{ color: "rgba(246,239,224,.65)" }}
                        />
                        {uploading && <div className="text-xs mt-1" style={{ color: "var(--gold)" }}>Uploading…</div>}
                        {logForm.files.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {logForm.files.map((f) => (
                              <span key={f.url} className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[0.7rem]" style={{ background: "rgba(198,152,58,.12)", color: "var(--ivory)", border: "1px solid var(--paper-line)" }}>
                                <FileText className="w-3 h-3" />
                                <a href={f.url} target="_blank" rel="noopener" className="underline-offset-2 hover:underline">{f.name}</a>
                                <span style={{ color: "rgba(246,239,224,.4)" }}>{fileSize(f.size)}</span>
                                <button type="button" onClick={() => setLogForm((prev) => ({ ...prev, files: prev.files.filter((x) => x.url !== f.url) }))} style={{ color: "var(--anaar-bright)" }}>
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs mb-1 block" style={{ color: "rgba(246,239,224,.7)" }}>Status update (optional)</label>
                        <select
                          value={logForm.status}
                          onChange={(e) => setLogForm((f) => ({ ...f, status: e.target.value }))}
                          className="w-full px-3 py-2 rounded-md text-sm"
                          style={{ background: "rgba(28,16,27,.7)", border: "1px solid var(--paper-line)", color: "var(--ivory)" }}
                        >
                          <option value="">Auto (contacted / follow_up)</option>
                          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                        </select>
                      </div>

                      <button
                        type="button"
                        disabled={busy === l.id}
                        onClick={() => void saveUpdate(l)}
                        className="w-full glossy-btn-gold py-3 rounded-md text-sm font-bold inline-flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" /> Save update + next follow-up
                      </button>

                      <div className="pt-2">
                        <label className="text-xs flex items-center gap-1 mb-1" style={{ color: "rgba(246,239,224,.55)" }}>
                          <XCircle className="w-3 h-3" /> Mark lost
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <select
                            value={lostReason}
                            onChange={(e) => setLostReason(e.target.value)}
                            className="px-3 py-2 rounded-md text-sm flex-1"
                            style={{ background: "rgba(28,16,27,.6)", border: "1px solid var(--paper-line)", color: "var(--ivory)" }}
                          >
                            <option value="">Reason…</option>
                            <option value="Budget too high">Budget too high</option>
                            <option value="Date not available">Date not available</option>
                            <option value="Chose another caterer">Chose another caterer</option>
                            <option value="Event cancelled">Event cancelled</option>
                            <option value="No response">No response</option>
                            <option value="Not a fit (guests/location)">Not a fit</option>
                            <option value="Other">Other</option>
                          </select>
                          <button type="button" onClick={() => void markLost(l)} className="px-3 py-2 rounded text-xs font-semibold" style={{ background: "rgba(156,42,56,.2)", color: "var(--anaar-bright)", border: "1px solid rgba(156,42,56,.35)" }}>
                            Confirm
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button type="button" onClick={() => openWa(l, "menu")} className="px-3 py-1.5 rounded text-xs inline-flex items-center gap-1" style={{ background: "rgba(246,239,224,.06)", border: "1px solid var(--paper-line)", color: "var(--ivory)" }}>
                          <ExternalLink className="w-3 h-3" /> Send menu link
                        </button>
                        {l.email && (
                          <a
                            href={`mailto:${l.email}?subject=${encodeURIComponent(`Your enquiry — Rasa by Narayanam`)}&body=${encodeURIComponent(buildWaMessage(l, "intro"))}`}
                            className="px-3 py-1.5 rounded text-xs inline-flex items-center gap-1"
                            style={{ background: "rgba(246,239,224,.06)", border: "1px solid var(--paper-line)", color: "var(--ivory)" }}
                          >
                            <Mail className="w-3 h-3" /> Email
                          </a>
                        )}
                      </div>
                    </div>

                    {/* HISTORY */}
                    <div className="pt-3">
                      <div className="text-[0.68rem] tracking-[0.2em] uppercase font-semibold mb-3" style={{ color: "var(--gold)" }}>
                        History — read this next time
                      </div>

                      {files.length > 0 && (
                        <div className="mb-3 p-2.5 rounded-md" style={{ background: "rgba(198,152,58,.06)", border: "1px solid var(--paper-line)" }}>
                          <div className="text-[0.66rem] uppercase tracking-wider mb-2" style={{ color: "var(--gold)" }}>All attachments</div>
                          <div className="flex flex-col gap-1.5">
                            {files.map((f) => (
                              <a key={f.url} href={f.url} target="_blank" rel="noopener" className="text-xs inline-flex items-center gap-1.5" style={{ color: "var(--ivory)" }}>
                                <Paperclip className="w-3 h-3" style={{ color: "var(--gold-bright)" }} />
                                {f.name}
                                <span style={{ color: "rgba(246,239,224,.4)" }}>({fileSize(f.size)})</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {timeline.length === 0 ? (
                        <div className="text-sm py-6 text-center rounded-md" style={{ color: "rgba(246,239,224,.45)", background: "rgba(246,239,224,.03)" }}>
                          Save an update after the first conversation.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                          {timeline.map((f, i) => (
                            <div key={`${f.at}-${i}`} className="p-3 rounded-md text-sm" style={{ background: "rgba(246,239,224,.04)", border: "1px solid var(--paper-line)" }}>
                              <div className="flex items-center gap-2 text-[0.68rem] mb-1 flex-wrap" style={{ color: "rgba(246,239,224,.5)" }}>
                                {f.type === "call" && <Phone className="w-3 h-3" />}
                                {f.type === "whatsapp" && <MessageCircle className="w-3 h-3" />}
                                {f.type === "note" && <StickyNote className="w-3 h-3" />}
                                {f.type === "schedule" && <Clock className="w-3 h-3" />}
                                {f.type === "email" && <Mail className="w-3 h-3" />}
                                {(f.type === "status" || f.type === "update") && <UserRound className="w-3 h-3" />}
                                <span className="uppercase tracking-wider font-semibold">{f.type}</span>
                                <span>· {fmtWhen(f.at)}</span>
                                {f.by && <span>· {f.by}</span>}
                              </div>
                              <div style={{ color: "var(--ivory)", whiteSpace: "pre-wrap" }}>{f.note || "—"}</div>
                              {f.nextAt && (
                                <div className="mt-1.5 text-xs inline-flex items-center gap-1" style={{ color: "var(--gold-bright)" }}>
                                  <CalendarClock className="w-3 h-3" /> Next was set: {fmtWhen(f.nextAt)}
                                </div>
                              )}
                              {f.files && f.files.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {f.files.map((file) => (
                                    <a key={file.url} href={file.url} target="_blank" rel="noopener" className="text-[0.7rem] inline-flex items-center gap-1 px-2 py-1 rounded" style={{ background: "rgba(198,152,58,.1)", border: "1px solid var(--paper-line)", color: "var(--ivory)" }}>
                                      <Paperclip className="w-3 h-3" /> {file.name}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
