"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/store/app-store";
import { CONFIG } from "@/lib/rasa-data";
import { ArrowLeft, LogOut, Users, Calendar, IndianRupee, Bell, TrendingUp, MessageCircle, AlertCircle, UtensilsCrossed, X, Paperclip, Send } from "lucide-react";
import AdminCatalog from "@/components/rasa/admin-catalog";
import AdminLeads from "@/components/rasa/admin-leads";

interface KPIs { totalBookings: number; todayBookings: number; totalCustomers: number; totalRevenue: number; pendingPayments: number; activeEvents: number; }
interface AdminBooking {
  id: string; bookingRef: string; eventDate: string; venue: string; city: string; guests: number;
  status: string; total: number; advancePaid: number; balance: number;
  user: { name: string | null; email: string; phone: string | null };
  package: { name: string } | null;
}
interface AdminCustomer {
  id: string; email: string; name: string | null; phone: string | null; city: string | null;
  createdAt: string; bookingCount: number; ltv: number;
}
interface AdminNotif {
  id: string; type: string; title: string; body: string; link: string | null;
  readAt: string | null; meta: string | null; createdAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, setUser, setToast } = useApp();
  const [tab, setTab] = useState<"overview" | "leads" | "bookings" | "customers" | "catalog" | "chat">("overview");
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [recentBookings, setRecentBookings] = useState<AdminBooking[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<AdminCustomer[]>([]);
  const [allBookings, setAllBookings] = useState<AdminBooking[]>([]);
  const [allCustomers, setAllCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newLeadCount, setNewLeadCount] = useState(0);
  const [notifications, setNotifications] = useState<AdminNotif[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [highlightLeadId, setHighlightLeadId] = useState<string | null>(null);
  const lastUnreadRef = useRef(0);
  const notifsReadyRef = useRef(false);

  const refreshNotifications = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/notifications?limit=30");
      if (!r.ok) return;
      const d = await r.json();
      const count = d.unreadCount || 0;
      setNotifications(d.notifications || []);
      setUnreadCount(count);
      if (notifsReadyRef.current && count > lastUnreadRef.current) {
        const newest = (d.notifications || []).find((n: AdminNotif) => !n.readAt);
        if (newest) setToast(newest.title);
      }
      lastUnreadRef.current = count;
      notifsReadyRef.current = true;
    } catch { /* ignore */ }
  }, [setToast]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    Promise.all([
      fetch("/api/admin/dashboard").then((r) => r.json()),
      fetch("/api/admin/bookings").then((r) => r.json()),
      fetch("/api/admin/customers").then((r) => r.json()),
      fetch("/api/admin/leads").then((r) => r.json()),
    ]).then(([d, b, c, l]) => {
      setKpis(d.kpis);
      setRecentBookings(d.recentBookings || []);
      setRecentCustomers(d.recentCustomers || []);
      setAllBookings(b.bookings || []);
      setAllCustomers(c.customers || []);
      setNewLeadCount((l.leads || []).filter((x: { status: string }) => x.status === "new").length);
      setLoading(false);
    }).catch(() => setLoading(false));

    void refreshNotifications();
    const i = setInterval(() => void refreshNotifications(), 12000);
    return () => clearInterval(i);
  }, [user, refreshNotifications]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#leads") setTab("leads");
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    setToast("Logged out");
    router.replace("/admin");
  };

  const markNotifRead = async (id: string) => {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    void refreshNotifications();
  };

  const markAllRead = async () => {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    void refreshNotifications();
  };

  const openNotif = async (n: AdminNotif) => {
    if (!n.readAt) await markNotifRead(n.id);
    let leadId: string | null = null;
    try {
      leadId = n.meta ? (JSON.parse(n.meta) as { leadId?: string }).leadId || null : null;
    } catch { /* ignore */ }
    if (n.type === "lead_new" || leadId) {
      setHighlightLeadId(leadId);
      setTab("leads");
      setShowNotifs(false);
    }
  };

  if (!user || user.role !== "admin") return null;

  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const fmtMoney = (n: number) => "₹" + (n / 100).toLocaleString("en-IN");

  const updateBookingStatus = async (id: string, status: string) => {
    const res = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setAllBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
      setToast(`Booking marked ${status}`);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-[240px] flex-shrink-0 flex flex-col" style={{ background: "linear-gradient(180deg,#180d17,#100809)", borderRight: "1px solid var(--paper-line)" }}>
        <div className="p-6">
          <img src={CONFIG.logo} alt="Rasa" className="logo-glow mb-2" style={{ height: "44px", width: "auto" }} />
          <div className="text-[0.6rem] tracking-[0.4em] uppercase mt-1" style={{ color: "rgba(246,239,224,.62)" }}>Admin Console</div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {[
            { id: "overview", label: "Overview", icon: TrendingUp },
            { id: "catalog", label: "Packages & Menu", icon: UtensilsCrossed },
            { id: "leads", label: "Leads", icon: Bell },
            { id: "bookings", label: "Bookings", icon: Calendar },
            { id: "customers", label: "Customers", icon: Users },
            { id: "chat", label: "Live Chat", icon: MessageCircle },
          ].map((t) => {
            const Icon = t.icon;
            const badge = t.id === "leads" ? (newLeadCount || unreadCount) : 0;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as typeof tab)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors relative"
                style={tab === t.id
                  ? { background: "rgba(198,152,58,.15)", color: "var(--gold-bright)" }
                  : { color: "rgba(246,239,224,.62)" }}
              >
                <Icon className="w-4 h-4" /> {t.label}
                {badge > 0 && (
                  <span className="ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full text-[0.65rem] font-bold flex items-center justify-center" style={{ background: "var(--anaar)", color: "#fff" }}>
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: "var(--paper-line)" }}>
          <button onClick={() => router.push("/")} className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm" style={{ color: "rgba(246,239,224,.62)" }}>
            <ArrowLeft className="w-4 h-4" /> Back to site
          </button>
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm" style={{ color: "var(--anaar-bright)" }}>
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6 sm:p-8 relative" style={{ background: "linear-gradient(180deg,#1a0f19,#221421)" }}>
        {/* Notifications bell */}
        <div className="absolute top-5 right-5 sm:top-7 sm:right-7 z-20">
          <button
            type="button"
            onClick={() => setShowNotifs((v) => !v)}
            className="relative w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "rgba(198,152,58,.12)", border: "1px solid var(--paper-line)", color: "var(--gold-bright)" }}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full text-[0.6rem] font-bold flex items-center justify-center" style={{ background: "var(--anaar)", color: "#fff" }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 mt-2 w-[min(380px,92vw)] max-h-[70vh] overflow-hidden rounded-lg shadow-xl flex flex-col" style={{ background: "#1c101b", border: "1px solid var(--paper-line)" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--paper-line)" }}>
                <div className="font-semibold text-sm" style={{ color: "var(--ivory)" }}>Notifications {unreadCount > 0 ? `(${unreadCount} new)` : ""}</div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button type="button" onClick={() => void markAllRead()} className="text-[0.68rem]" style={{ color: "var(--gold-bright)" }}>Mark all read</button>
                  )}
                  <button type="button" onClick={() => setShowNotifs(false)} style={{ color: "rgba(246,239,224,.5)" }}><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm" style={{ color: "rgba(246,239,224,.5)" }}>No notifications yet. Contact form leads appear here instantly.</div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => void openNotif(n)}
                      className="w-full text-left px-4 py-3 border-b transition-colors"
                      style={{
                        borderColor: "var(--paper-line)",
                        background: n.readAt ? "transparent" : "rgba(198,152,58,.08)",
                      }}
                    >
                      <div className="flex items-start gap-2">
                        {!n.readAt && <span className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--anaar)" }} />}
                        <div className={!n.readAt ? "" : "pl-4"}>
                          <div className="text-sm font-medium" style={{ color: "var(--ivory)" }}>{n.title}</div>
                          <div className="text-xs mt-0.5 whitespace-pre-line" style={{ color: "rgba(246,239,224,.55)" }}>{n.body}</div>
                          <div className="text-[0.65rem] mt-1" style={{ color: "rgba(246,239,224,.35)" }}>
                            {new Date(n.createdAt).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {tab === "overview" && (
          <div>
            <div className="mb-6">
              <div className="text-[0.72rem] tracking-[0.32em] uppercase mb-1" style={{ color: "var(--gold)" }}>Dashboard</div>
              <h1 className="font-display text-[2rem]" style={{ color: "var(--ivory)" }}>Welcome, {user.name || "Admin"}</h1>
              {(newLeadCount > 0 || unreadCount > 0) && (
                <button
                  type="button"
                  onClick={() => setTab("leads")}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold"
                  style={{ background: "rgba(156,42,56,.2)", color: "var(--anaar-bright)", border: "1px solid rgba(156,42,56,.4)" }}
                >
                  <Bell className="w-4 h-4" />
                  {newLeadCount > 0 ? `${newLeadCount} new lead${newLeadCount > 1 ? "s" : ""} waiting` : `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`}
                </button>
              )}
            </div>
            {loading || !kpis ? (
              <div className="text-center py-8" style={{ color: "rgba(246,239,224,.62)" }}>Loading…</div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                  {[
                    { label: "Total Bookings", value: kpis.totalBookings, icon: Calendar, color: "var(--gold-bright)" },
                    { label: "Today's Bookings", value: kpis.todayBookings, icon: TrendingUp, color: "var(--gold)" },
                    { label: "Active Events", value: kpis.activeEvents, icon: Bell, color: "var(--anaar-bright)" },
                    { label: "Customers", value: kpis.totalCustomers, icon: Users, color: "#AEBB55" },
                    { label: "Total Revenue", value: fmtMoney(kpis.totalRevenue), icon: IndianRupee, color: "#1f7a5c" },
                    { label: "Pending Payments", value: kpis.pendingPayments, icon: AlertCircle, color: "var(--anaar)" },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="glass-panel rounded-lg p-4">
                        <Icon className="w-4 h-4 mb-2" style={{ color: stat.color }} />
                        <div className="text-[0.66rem] tracking-[0.14em] uppercase" style={{ color: "rgba(246,239,224,.62)" }}>{stat.label}</div>
                        <div className="font-display text-[1.4rem] mt-1" style={{ color: "var(--ivory)" }}>{stat.value}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="glass-panel rounded-lg p-5">
                    <h3 className="font-display text-[1.2rem] mb-4" style={{ color: "var(--ivory)" }}>Recent Bookings</h3>
                    {recentBookings.length === 0 ? (
                      <div className="text-sm py-4 text-center" style={{ color: "rgba(246,239,224,.62)" }}>No bookings yet.</div>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {recentBookings.map((b) => (
                          <div key={b.id} className="p-3 rounded-md flex justify-between items-center" style={{ background: "rgba(198,152,58,.06)", border: "1px solid var(--paper-line)" }}>
                            <div>
                              <div className="font-medium text-sm" style={{ color: "var(--ivory)" }}>{b.user.name || b.user.email}</div>
                              <div className="text-xs" style={{ color: "rgba(246,239,224,.62)" }}>{b.package?.name} · {b.guests} guests · {fmtDate(b.eventDate)}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-sm" style={{ color: "var(--gold-bright)" }}>{fmtMoney(b.total)}</div>
                              <div className="text-[0.66rem] uppercase tracking-wider" style={{ color: "rgba(246,239,224,.62)" }}>{b.status}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="glass-panel rounded-lg p-5">
                    <h3 className="font-display text-[1.2rem] mb-4" style={{ color: "var(--ivory)" }}>Recent Customers</h3>
                    {recentCustomers.length === 0 ? (
                      <div className="text-sm py-4 text-center" style={{ color: "rgba(246,239,224,.62)" }}>No customers yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {recentCustomers.map((c) => (
                          <div key={c.id} className="p-3 rounded-md flex justify-between items-center" style={{ background: "rgba(198,152,58,.06)", border: "1px solid var(--paper-line)" }}>
                            <div>
                              <div className="font-medium text-sm" style={{ color: "var(--ivory)" }}>{c.name || c.email}</div>
                              <div className="text-xs" style={{ color: "rgba(246,239,224,.62)" }}>{c.city || "—"} · joined {fmtDate(c.createdAt)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs" style={{ color: "rgba(246,239,224,.62)" }}>{c.phone || "no phone"}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "bookings" && (
          <div>
            <h1 className="font-display text-[2rem] mb-6" style={{ color: "var(--ivory)" }}>All Bookings</h1>
            {loading ? (
              <div className="text-center py-8" style={{ color: "rgba(246,239,224,.62)" }}>Loading…</div>
            ) : allBookings.length === 0 ? (
              <div className="glass-panel rounded-lg p-8 text-center" style={{ color: "rgba(246,239,224,.62)" }}>No bookings yet.</div>
            ) : (
              <div className="space-y-3">
                {allBookings.map((b) => (
                  <div key={b.id} className="glass-panel rounded-lg p-5">
                    <div className="flex flex-wrap justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-display text-[1.1rem]" style={{ color: "var(--ivory)" }}>{b.bookingRef}</span>
                          <span className="px-2 py-0.5 rounded-full text-[0.66rem] font-bold uppercase tracking-wider" style={{
                            background: b.status === "confirmed" ? "rgba(31,122,92,.15)" : b.status === "completed" ? "rgba(198,152,58,.15)" : "rgba(156,42,56,.15)",
                            color: b.status === "confirmed" ? "#1f7a5c" : b.status === "completed" ? "var(--gold)" : "var(--anaar)",
                          }}>{b.status}</span>
                        </div>
                        <div className="text-sm" style={{ color: "var(--ivory)" }}>{b.user.name || b.user.email} · {b.package?.name}</div>
                        <div className="text-xs mt-1" style={{ color: "rgba(246,239,224,.62)" }}>
                          {fmtDate(b.eventDate)} · {b.guests} guests · {b.venue}, {b.city}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-[1.3rem]" style={{ color: "var(--gold-bright)" }}>{fmtMoney(b.total)}</div>
                        <div className="text-xs" style={{ color: "rgba(246,239,224,.62)" }}>Paid {fmtMoney(b.advancePaid)} · Balance {fmtMoney(b.balance)}</div>
                        <div className="flex gap-1 mt-2 justify-end">
                          <button onClick={() => window.open(`/api/quotation-pdf?bookingId=${b.id}`, "_blank")} className="glossy-btn-gold px-2 py-1 rounded text-[0.66rem] font-semibold">
                            Quotation PDF
                          </button>
                          <a href={`https://wa.me/${CONFIG.bossWhatsApp}?text=${encodeURIComponent(`Booking ${b.bookingRef} - ${b.user?.name || b.user?.email} - ${fmtMoney(b.total)}`)}`} target="_blank" rel="noopener" className="glossy-btn-wa px-2 py-1 rounded text-[0.66rem] font-semibold">
                            WA
                          </a>
                        </div>
                        <select
                          value={b.status}
                          onChange={(e) => updateBookingStatus(b.id, e.target.value)}
                          className="mt-2 px-2 py-1 rounded text-xs"
                          style={{ background: "rgba(28,16,27,.8)", border: "1px solid var(--paper-line)", color: "var(--ivory)" }}
                        >
                          <option value="pending">pending</option>
                          <option value="confirmed">confirmed</option>
                          <option value="menu_locked">menu_locked</option>
                          <option value="completed">completed</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "customers" && (
          <div>
            <h1 className="font-display text-[2rem] mb-6" style={{ color: "var(--ivory)" }}>All Customers</h1>
            {loading ? (
              <div className="text-center py-8" style={{ color: "rgba(246,239,224,.62)" }}>Loading…</div>
            ) : allCustomers.length === 0 ? (
              <div className="glass-panel rounded-lg p-8 text-center" style={{ color: "rgba(246,239,224,.62)" }}>No customers yet.</div>
            ) : (
              <div className="glass-panel rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--ink-3)" }}>
                      {["Name", "Email", "Phone", "City", "Bookings", "LTV"].map((h) => (
                        <th key={h} className="text-left p-3 text-[0.72rem] tracking-[0.14em] uppercase font-bold" style={{ color: "var(--ivory)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allCustomers.map((c, i) => (
                      <tr key={c.id} style={{ background: i % 2 === 0 ? "rgba(246,239,224,.03)" : "transparent" }}>
                        <td className="p-3" style={{ color: "var(--ivory)" }}>{c.name || "—"}</td>
                        <td className="p-3" style={{ color: "var(--ivory)" }}>{c.email}</td>
                        <td className="p-3" style={{ color: "rgba(246,239,224,.62)" }}>{c.phone || "—"}</td>
                        <td className="p-3" style={{ color: "rgba(246,239,224,.62)" }}>{c.city || "—"}</td>
                        <td className="p-3" style={{ color: "var(--gold-bright)" }}>{c.bookingCount}</td>
                        <td className="p-3 font-semibold" style={{ color: "var(--anaar-bright)" }}>{fmtMoney(c.ltv)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "leads" && (
          <AdminLeads
            highlightLeadId={highlightLeadId}
            onEngage={() => {
              void refreshNotifications();
              fetch("/api/admin/leads").then((r) => r.json()).then((l) => {
                setNewLeadCount((l.leads || []).filter((x: { status: string }) => x.status === "new").length);
              });
            }}
          />
        )}

        {tab === "catalog" && <AdminCatalog />}

        {tab === "chat" && <AdminChat />}
      </main>
    </div>
  );
}

function fmtSessionWhen(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function AdminChat() {
  const [conversations, setConversations] = useState<Array<{
    id: string;
    status: string;
    closedAt?: string | null;
    user: { name: string | null; email: string };
  }>>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; senderType: string; text: string; attachmentUrl?: string | null; createdAt: string }>>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [peerTyping, setPeerTyping] = useState<string | null>(null);
  const [chatStatus, setChatStatus] = useState<string>("active");
  const [closedAt, setClosedAt] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTyped = useRef(0);

  const loadConversations = useCallback(() => {
    fetch("/api/chat", { credentials: "include" }).then((r) => r.json()).then((d) => {
      setConversations(d.conversations || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadConversations();
    const i = setInterval(loadConversations, 8000);
    return () => clearInterval(i);
  }, [loadConversations]);

  const refreshMessages = useCallback(async (id: string) => {
    const d = await fetch(`/api/chat?conversationId=${id}`, { credentials: "include" }).then((r) => r.json());
    setMessages(d.messages || []);
    setPeerTyping(d.typing?.senderType || null);
    setChatStatus(d.status || "active");
    setClosedAt(d.closedAt || null);
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }, []);

  const pollTyping = useCallback(async (id: string) => {
    try {
      const d = await fetch(`/api/chat/typing?conversationId=${id}`, { credentials: "include" }).then((r) => r.json());
      setPeerTyping(d.typing?.senderType || null);
      if (d.status) setChatStatus(d.status);
      if (d.closedAt !== undefined) setClosedAt(d.closedAt || null);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!activeId) return;
    refreshMessages(activeId);
    pollTyping(activeId);
    const msgs = setInterval(() => refreshMessages(activeId), 2000);
    const typ = setInterval(() => pollTyping(activeId), 500);
    return () => {
      clearInterval(msgs);
      clearInterval(typ);
    };
  }, [activeId, refreshMessages, pollTyping]);

  const notifyTyping = useCallback((on: boolean) => {
    if (!activeId || chatStatus === "closed") return;
    fetch("/api/chat/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ conversationId: activeId, typing: on }),
    }).catch(() => {});
  }, [activeId, chatStatus]);

  const onTextChange = (v: string) => {
    setText(v);
    if (!activeId || chatStatus === "closed") return;
    if (!v.trim()) {
      notifyTyping(false);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      return;
    }
    const now = Date.now();
    if (now - lastTyped.current > 200) {
      lastTyped.current = now;
      notifyTyping(true);
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => notifyTyping(false), 2800);
  };

  const endSession = async () => {
    if (!activeId) return;
    const res = await fetch("/api/chat/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ conversationId: activeId, action: "close" }),
    });
    const d = await res.json();
    if (res.ok) {
      setChatStatus("closed");
      setClosedAt(d.closedAt || new Date().toISOString());
      setPeerTyping(null);
      loadConversations();
    }
  };

  const reopenSession = async () => {
    if (!activeId) return;
    const res = await fetch("/api/chat/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ conversationId: activeId, action: "reopen" }),
    });
    if (res.ok) {
      setChatStatus("active");
      setClosedAt(null);
      loadConversations();
    }
  };

  const sendPayload = async (payload: { text?: string; attachmentUrl?: string }) => {
    if (!activeId || chatStatus === "closed") return;
    notifyTyping(false);
    const optimistic = {
      id: "tmp-" + Date.now(),
      senderType: "admin",
      text: payload.text || (payload.attachmentUrl ? "[Image]" : ""),
      attachmentUrl: payload.attachmentUrl || null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ conversationId: activeId, ...payload }),
    });
    if (res.ok) await refreshMessages(activeId);
  };

  const send = async () => {
    if (!text.trim() || !activeId) return;
    await sendPayload({ text: text.trim() });
  };

  const uploadFile = async (file: File) => {
    if (!activeId || chatStatus === "closed") return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("conversationId", activeId);
      fd.append("file", file);
      const up = await fetch("/api/chat/upload", { method: "POST", credentials: "include", body: fd }).then((r) => r.json());
      if (!up.file?.url) throw new Error(up.error || "Upload failed");
      await sendPayload({
        text: file.type.startsWith("image/") ? "" : `Shared: ${file.name}`,
        attachmentUrl: up.file.url,
      });
    } catch {
      /* ignore */
    } finally {
      setUploading(false);
    }
  };

  const onPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !activeId || chatStatus === "closed") return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await uploadFile(file);
        return;
      }
    }
  };

  const activeConv = conversations.find((c) => c.id === activeId);
  const isClosed = chatStatus === "closed";

  if (loading) return <div className="text-center py-8" style={{ color: "rgba(246,239,224,.62)" }}>Loading…</div>;

  return (
    <div>
      <h1 className="font-display text-[2rem] mb-6" style={{ color: "var(--ivory)" }}>Live Chat</h1>
      <div className="grid lg:grid-cols-[300px_1fr] gap-4 h-[600px]">
        <div className="glass-panel rounded-lg overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-sm" style={{ color: "rgba(246,239,224,.62)" }}>No conversations yet.</div>
          ) : (
            conversations.map((c) => {
              const ended = c.status === "closed";
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className="w-full p-4 text-left border-b transition-colors"
                  style={{
                    borderColor: "var(--paper-line)",
                    background: activeId === c.id
                      ? ended ? "rgba(156,42,56,.22)" : "rgba(198,152,58,.15)"
                      : ended ? "rgba(156,42,56,.08)" : "transparent",
                    opacity: ended && activeId !== c.id ? 0.72 : 1,
                  }}
                >
                  <div className="font-medium text-sm" style={{ color: ended ? "rgba(246,239,224,.55)" : "var(--ivory)" }}>
                    {c.user.name || c.user.email}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: ended ? "var(--anaar-bright)" : "rgba(246,239,224,.62)" }}>
                    {ended
                      ? `Session ended · ${fmtSessionWhen(c.closedAt)}`
                      : "Active"}
                  </div>
                </button>
              );
            })
          )}
        </div>
        <div
          className="glass-panel rounded-lg flex flex-col"
          style={isClosed ? { borderColor: "rgba(156,42,56,.45)", boxShadow: "inset 0 0 0 1px rgba(156,42,56,.2)" } : undefined}
        >
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "rgba(246,239,224,.62)" }}>Select a conversation</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b flex items-center justify-between gap-3" style={{
                borderColor: "var(--paper-line)",
                background: isClosed ? "rgba(156,42,56,.18)" : "rgba(198,152,58,.08)",
              }}>
                <div>
                  <div className="font-medium text-sm" style={{ color: "var(--ivory)" }}>
                    {activeConv?.user.name || activeConv?.user.email || "Customer"}
                  </div>
                  <div className="text-[0.72rem]" style={{ color: isClosed ? "var(--anaar-bright)" : "rgba(246,239,224,.62)" }}>
                    {isClosed ? `Session ended · ${fmtSessionWhen(closedAt)}` : "Live session"}
                  </div>
                </div>
                {isClosed ? (
                  <button onClick={reopenSession} className="text-xs px-3 py-1.5 rounded-md font-semibold" style={{ background: "rgba(198,152,58,.2)", color: "var(--gold-bright)" }}>
                    Reopen
                  </button>
                ) : (
                  <button onClick={endSession} className="text-xs px-3 py-1.5 rounded-md font-semibold" style={{ background: "rgba(156,42,56,.35)", color: "#f6c4c8" }}>
                    End session
                  </button>
                )}
              </div>
              <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => {
                  const mine = m.senderType === "admin";
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[70%] px-3 py-2 rounded-lg text-sm" style={{
                        background: mine ? "var(--gold)" : m.senderType === "bot" ? "rgba(156,42,56,.3)" : "rgba(246,239,224,.1)",
                        color: mine ? "#231318" : "var(--ivory)",
                      }}>
                        {!mine && (
                          <div className="text-[0.66rem] uppercase tracking-wider opacity-60 mb-1">
                            {m.senderType === "bot" ? "Bot" : "Customer"}
                          </div>
                        )}
                        {m.attachmentUrl && (
                          <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block mb-1.5">
                            {/\.(png|jpe?g|gif|webp)$/i.test(m.attachmentUrl) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.attachmentUrl} alt="Attachment" className="rounded-md max-h-44 object-cover" />
                            ) : (
                              <span className="underline text-xs flex items-center gap-1"><Paperclip className="w-3 h-3" /> Open file</span>
                            )}
                          </a>
                        )}
                        {m.text && m.text !== "[Image]" && m.text !== "[File]" && <div>{m.text}</div>}
                      </div>
                    </div>
                  );
                })}
                {!isClosed && peerTyping === "user" && (
                  <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-lg text-sm flex items-center gap-2" style={{ background: "rgba(246,239,224,.12)", color: "var(--ivory)" }}>
                      <span className="text-[0.66rem] uppercase tracking-wider" style={{ color: "var(--gold-bright)" }}>Customer is typing</span>
                      <span className="typing-dots flex gap-1 items-center h-3"><i /><i /><i /></span>
                    </div>
                  </div>
                )}
                {isClosed && (
                  <div className="text-center py-3">
                    <div
                      className="inline-block px-4 py-2 rounded-full text-[0.78rem] font-medium"
                      style={{ background: "rgba(156,42,56,.28)", color: "#f0b4b8", border: "1px solid rgba(190,63,73,.45)" }}
                    >
                      Session ended · {fmtSessionWhen(closedAt)}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3 border-t flex gap-2 items-end" style={{ borderColor: "var(--paper-line)", opacity: isClosed ? 0.55 : 1 }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadFile(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || isClosed}
                  className="p-2 rounded-md"
                  style={{ color: "var(--gold-bright)", background: "rgba(198,152,58,.12)" }}
                  title="Attach"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  value={text}
                  onChange={(e) => onTextChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isClosed && send()}
                  onPaste={onPaste}
                  disabled={isClosed}
                  placeholder={isClosed ? "Session ended — reopen to reply" : "Type a reply or paste an image…"}
                  className="flex-1 px-3 py-2 rounded-md text-sm"
                  style={{ background: "rgba(28,16,27,.5)", border: "1px solid var(--paper-line)", color: "var(--ivory)" }}
                />
                <button onClick={send} disabled={!text.trim() || uploading || isClosed} className="glossy-btn-gold px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50 flex items-center gap-1">
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
