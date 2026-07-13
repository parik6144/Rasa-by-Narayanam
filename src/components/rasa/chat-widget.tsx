"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "@/store/app-store";
import { MessageCircle, X, Send, Paperclip, ImageIcon } from "lucide-react";

interface Msg {
  id: string;
  senderType: string;
  text: string;
  attachmentUrl?: string | null;
  createdAt: string;
}

function isMine(senderType: string) {
  return senderType === "user";
}

function TypingDots({ label }: { label: string }) {
  return (
    <div className="flex justify-start">
      <div
        className="px-3 py-2 rounded-lg text-sm flex items-center gap-2"
        style={{ background: "rgba(58,39,51,.1)", color: "#2c1a26" }}
      >
        <span className="text-[0.66rem] uppercase tracking-wider opacity-60">{label}</span>
        <span className="typing-dots flex gap-1 items-center h-3">
          <i /><i /><i />
        </span>
      </div>
    </div>
  );
}

export default function ChatWidget() {
  const { chatWidgetOpen, setChatWidget, user } = useApp();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [peerTyping, setPeerTyping] = useState<string | null>(null);
  const [chatStatus, setChatStatus] = useState<string>("active");
  const [closedAt, setClosedAt] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTyped = useRef(0);

  const scrollBottom = () => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  };

  const fmtEnded = (iso: string | null) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const refresh = useCallback(async (id: string) => {
    const d = await fetch(`/api/chat?conversationId=${id}`, { credentials: "include" }).then((r) => r.json());
    setMessages(d.messages || []);
    setPeerTyping(d.typing?.senderType || null);
    setChatStatus(d.status || "active");
    setClosedAt(d.closedAt || null);
    scrollBottom();
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
    if (!chatWidgetOpen || !conversationId) return;
    refresh(conversationId);
    pollTyping(conversationId);
    const msgs = setInterval(() => refresh(conversationId), 2000);
    const typ = setInterval(() => pollTyping(conversationId), 500);
    return () => {
      clearInterval(msgs);
      clearInterval(typ);
    };
  }, [chatWidgetOpen, conversationId, refresh, pollTyping]);

  useEffect(() => {
    scrollBottom();
  }, [messages, peerTyping, chatStatus]);

  const notifyTyping = useCallback((on: boolean) => {
    if (!conversationId || chatStatus === "closed") return;
    fetch("/api/chat/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ conversationId, typing: on }),
    }).catch(() => {});
  }, [conversationId, chatStatus]);

  const onTextChange = (v: string) => {
    setText(v);
    if (!conversationId || chatStatus === "closed") return;
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
      setPeerTyping("bot");
      setTimeout(() => refresh(d.conversationId), 1600);
    } finally {
      setLoading(false);
    }
  };

  const sendPayload = async (payload: { text?: string; attachmentUrl?: string }) => {
    if ((!conversationId && !payload.text) || chatStatus === "closed") return;
    notifyTyping(false);
    const optimistic: Msg = {
      id: "tmp-" + Date.now(),
      senderType: "user",
      text: payload.text || (payload.attachmentUrl ? "[Image]" : ""),
      attachmentUrl: payload.attachmentUrl || null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    scrollBottom();

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ conversationId, ...payload }),
    });
    const d = await res.json();
    if (!res.ok) {
      setMessages((prev) => [
        ...prev,
        { id: "err-" + Date.now(), senderType: "bot", text: d.error || "Message failed.", createdAt: new Date().toISOString() },
      ]);
      return;
    }
    const id = d.conversationId || conversationId;
    if (!conversationId) setConversationId(id);
    if (d.botPending) setPeerTyping("bot");
    await refresh(id);
  };

  const send = async () => {
    if (!text.trim()) return;
    await sendPayload({ text: text.trim() });
  };

  const uploadFile = async (file: File) => {
    if (!conversationId || chatStatus === "closed") return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf" && file.type !== "text/plain") {
      setMessages((prev) => [
        ...prev,
        { id: "err-" + Date.now(), senderType: "bot", text: "Only images, PDF or text files can be sent.", createdAt: new Date().toISOString() },
      ]);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("conversationId", conversationId);
      fd.append("file", file);
      const up = await fetch("/api/chat/upload", { method: "POST", credentials: "include", body: fd }).then((r) => r.json());
      if (!up.file?.url) throw new Error(up.error || "Upload failed");
      await sendPayload({
        text: file.type.startsWith("image/") ? "" : `Shared: ${file.name}`,
        attachmentUrl: up.file.url,
      });
    } catch (e: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          senderType: "bot",
          text: e instanceof Error ? e.message : "Upload failed",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setUploading(false);
    }
  };

  const onPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !conversationId) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await uploadFile(file);
        return;
      }
    }
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

  const typingLabel =
    peerTyping === "admin" ? "Support is typing" : peerTyping === "bot" ? "Rasa is typing" : peerTyping ? "Typing" : null;
  const isClosed = chatStatus === "closed";

  return (
    <div
      className="fixed bottom-6 right-6 z-[90] w-[360px] max-w-[calc(100vw-3rem)] glass-panel-ivory rounded-xl flex flex-col overflow-hidden"
      style={{ height: "500px", maxHeight: "calc(100vh-3rem)" }}
    >
      <div className="p-4 flex items-center justify-between" style={{
        background: isClosed ? "linear-gradient(180deg,#3a1820,#2a1218)" : "linear-gradient(180deg,#2f1e2f,#221421)",
        color: "var(--ivory)",
      }}>
        <div>
          <div className="font-display text-[1.1rem]">Rasa Support</div>
          <div className="text-[0.72rem] flex items-center gap-2" style={{ color: isClosed ? "#f0b4b8" : "rgba(246,239,224,.62)" }}>
            {isClosed ? (
              <>Session ended · {fmtEnded(closedAt)}</>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full" style={{ background: "#1f7a5c" }} /> Online · usually replies fast
              </>
            )}
          </div>
        </div>
        <button onClick={() => setChatWidget(false)} className="w-8 h-8 rounded-full border flex items-center justify-center" style={{ borderColor: "var(--paper-line)" }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2" style={{ background: "var(--ivory-2)" }}>
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
            <button
              onClick={startConversation}
              disabled={loading || (!user && (!guestName || !guestEmail))}
              className="w-full py-2 rounded-md text-sm font-semibold disabled:opacity-60 transition-all"
              style={{ background: "linear-gradient(180deg,#2a9970,#1f7a5c)", color: "#fff", boxShadow: "0 4px 12px -3px rgba(31,122,92,0.4)" }}
            >
              {loading ? "Starting…" : "Start chat"}
            </button>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <div key={m.id} className={`flex ${isMine(m.senderType) ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[80%] px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: isMine(m.senderType)
                      ? "var(--gold)"
                      : m.senderType === "bot"
                        ? "rgba(156,42,56,.15)"
                        : "rgba(58,39,51,.1)",
                    color: isMine(m.senderType) ? "#231318" : "#2c1a26",
                  }}
                >
                  {!isMine(m.senderType) && (
                    <div className="text-[0.66rem] uppercase tracking-wider opacity-60 mb-1">
                      {m.senderType === "bot" ? "Rasa Bot" : m.senderType === "admin" ? "Support" : "Rasa"}
                    </div>
                  )}
                  {m.attachmentUrl && (
                    <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block mb-1.5">
                      {/\.(png|jpe?g|gif|webp)$/i.test(m.attachmentUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.attachmentUrl} alt="Attachment" className="rounded-md max-h-40 object-cover" />
                      ) : (
                        <span className="underline text-xs flex items-center gap-1">
                          <Paperclip className="w-3 h-3" /> Open file
                        </span>
                      )}
                    </a>
                  )}
                  {m.text && m.text !== "[Image]" && m.text !== "[File]" && <div>{m.text}</div>}
                </div>
              </div>
            ))}
            {typingLabel && !isClosed && <TypingDots label={typingLabel} />}
            {isClosed && (
              <div className="text-center py-2">
                <div
                  className="inline-block px-3 py-1.5 rounded-full text-[0.72rem] font-medium"
                  style={{ background: "rgba(156,42,56,.18)", color: "#9C2A38", border: "1px solid rgba(156,42,56,.35)" }}
                >
                  Session ended · {fmtEnded(closedAt)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {conversationId && (
        <div className="p-2 border-t flex gap-1.5 items-end" style={{ borderColor: "rgba(58,39,51,.14)", opacity: isClosed ? 0.55 : 1 }}>
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
            className="p-2 rounded-md shrink-0"
            style={{ color: "#3a2733", background: "rgba(58,39,51,.06)" }}
            title="Attach image or file"
          >
            {uploading ? <ImageIcon className="w-4 h-4 animate-pulse" /> : <Paperclip className="w-4 h-4" />}
          </button>
          <input
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !isClosed && send()}
            onPaste={onPaste}
            disabled={isClosed}
            placeholder={isClosed ? "Session ended" : "Message or paste an image…"}
            className="flex-1 px-3 py-2 rounded-md text-sm border"
            style={{ borderColor: "rgba(58,39,51,.2)" }}
          />
          <button
            onClick={send}
            disabled={!text.trim() || uploading || isClosed}
            className="p-2 rounded-md transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(180deg,#2a9970,#1f7a5c)", color: "#fff" }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
