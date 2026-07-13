"use client";
import { useState, useEffect } from "react";
import { useApp } from "@/store/app-store";
import { MessageCircle, X, Send } from "lucide-react";

interface Msg { id: string; senderType: string; text: string; createdAt: string; }

export default function ChatWidget() {
  const { chatWidgetOpen, setChatWidget, user } = useApp();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  useEffect(() => {
    if (!chatWidgetOpen || !conversationId) return;
    const i = setInterval(() => {
      fetch(`/api/chat?conversationId=${conversationId}`, { credentials: "include" }).then((r) => r.json()).then((d) => {
        setMessages(d.messages || []);
      }).catch(() => {});
    }, 3000);
    return () => clearInterval(i);
  }, [chatWidgetOpen, conversationId]);

  const startConversation = async () => {
    if (!user && (!guestName.trim() || !guestEmail.trim())) return;
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          text: user ? `Hi, I'm ${user.name || user.email}.` : `Hi, I'm ${guestName.trim()} (${guestEmail.trim()}).`,
          ...(!user ? { guestName: guestName.trim(), guestEmail: guestEmail.trim() } : {}),
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMessages([{ id: "err", senderType: "bot", text: d.error || "Could not start chat. Please try again.", createdAt: new Date().toISOString() }]);
        return;
      }
      setConversationId(d.conversationId);
      const refresh = await fetch(`/api/chat?conversationId=${d.conversationId}`, { credentials: "include" }).then((r) => r.json());
      const loaded = refresh.messages || [];
      setMessages(
        loaded.length
          ? loaded
          : [{ id: "bot-welcome", senderType: "bot", text: "Welcome to Rasa! How can we help you today? Ask about packages, pricing, dietary options, or booking.", createdAt: new Date().toISOString() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if (!text.trim()) return;
    const msg = text;
    setText("");
    setMessages((prev) => [...prev, { id: "tmp-" + Date.now(), senderType: "user", text: msg, createdAt: new Date().toISOString() }]);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ conversationId, text: msg }),
    });
    const d = await res.json();
    if (!res.ok) {
      setMessages((prev) => [...prev, { id: "err-" + Date.now(), senderType: "bot", text: d.error || "Message failed. Please refresh and try again.", createdAt: new Date().toISOString() }]);
      return;
    }
    const refresh = await fetch(`/api/chat?conversationId=${d.conversationId || conversationId}`, { credentials: "include" }).then((r) => r.json());
    setMessages(refresh.messages || []);
    if (!conversationId) setConversationId(d.conversationId);
  };

  if (!chatWidgetOpen) {
    return (
      <button
        onClick={() => setChatWidget(true)}
        className="fixed bottom-6 right-6 z-[90] w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
        style={{ background: "linear-gradient(135deg,#2a9970,#1f7a5c)", color: "#fff" }}
        aria-label="Open chat"
        title="Chat with us"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[90] w-[360px] max-w-[calc(100vw-3rem)] glass-panel-ivory rounded-xl flex flex-col overflow-hidden" style={{ height: "500px", maxHeight: "calc(100vh-3rem)" }}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between" style={{ background: "linear-gradient(180deg,#2f1e2f,#221421)", color: "var(--ivory)" }}>
        <div>
          <div className="font-display text-[1.1rem]">Rasa Support</div>
          <div className="text-[0.72rem] flex items-center gap-2" style={{ color: "rgba(246,239,224,.62)" }}>
            <span className="w-2 h-2 rounded-full" style={{ background: "#1f7a5c" }} /> Online · replies in ~90s
          </div>
        </div>
        <button onClick={() => setChatWidget(false)} className="w-8 h-8 rounded-full border flex items-center justify-center" style={{ borderColor: "var(--paper-line)" }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ background: "var(--ivory-2)" }}>
        {messages.length === 0 && !conversationId ? (
          <div className="text-center py-4">
            <div className="text-sm mb-3" style={{ color: "var(--on-ivory-dim)" }}>
              Hi! Ask us anything about packages, pricing, or booking.
            </div>
            {!user && (
              <div className="space-y-2 mb-3">
                <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Your name" className="w-full px-3 py-2 rounded-md text-sm border" style={{ borderColor: "rgba(58,39,51,.2)" }} />
                <input value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="Email or phone" className="w-full px-3 py-2 rounded-md text-sm border" style={{ borderColor: "rgba(58,39,51,.2)" }} />
              </div>
            )}
            <button onClick={startConversation} disabled={loading || (!user && (!guestName || !guestEmail))} className="w-full py-2 rounded-md text-sm font-semibold disabled:opacity-60 transition-all" style={{ background: "linear-gradient(180deg,#2a9970,#1f7a5c)", color: "#fff", boxShadow: "0 4px 12px -3px rgba(31,122,92,0.4)" }}>
              {loading ? "Starting…" : "Start chat"}
            </button>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.senderType === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%] px-3 py-2 rounded-lg text-sm" style={{
                background: m.senderType === "user" ? "var(--gold)" : m.senderType === "bot" ? "rgba(156,42,56,.15)" : "rgba(58,39,51,.1)",
                color: m.senderType === "user" ? "#231318" : "#2c1a26",
              }}>
                {m.senderType === "bot" && <div className="text-[0.66rem] uppercase tracking-wider opacity-60 mb-1">Rasa Bot</div>}
                {m.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      {conversationId && (
        <div className="p-2 border-t flex gap-2" style={{ borderColor: "rgba(58,39,51,.14)" }}>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message…" className="flex-1 px-3 py-2 rounded-md text-sm border" style={{ borderColor: "rgba(58,39,51,.2)" }} />
          <button onClick={send} className="p-2 rounded-md transition-all" style={{ background: "linear-gradient(180deg,#2a9970,#1f7a5c)", color: "#fff" }}>
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
