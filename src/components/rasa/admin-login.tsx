"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/store/app-store";
import { CONFIG } from "@/lib/rasa-data";
import { ArrowLeft, Mail, Lock, Shield } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const { setUser, setToast, setSessionChecked } = useApp();
  const [email, setEmail] = useState("admin@rasakitchen.co");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      if (data.user.role !== "admin") {
        setErr("This account is not an admin.");
        return;
      }
      // Keep session in store + sessionStorage — do NOT remount via router.replace
      setUser(data.user);
      setSessionChecked(true);
      setToast("Admin logged in");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{
      background: "radial-gradient(60% 40% at 80% 0%,rgba(156,42,56,.30),transparent 60%), linear-gradient(180deg,#1c101b,#251526)",
    }}>
      <div className="mirror-panel rounded-xl p-8 w-full max-w-[460px]">
        <button onClick={() => router.push("/")} className="mb-4 flex items-center gap-2 text-sm" style={{ color: "rgba(246,239,224,.62)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to site
        </button>
        <img src={CONFIG.logo} alt="Rasa" className="logo-glow mb-4 mx-auto" style={{ height: "72px" }} />
        <div className="flex items-center gap-3 mb-2 justify-center">
          <Shield className="w-6 h-6" style={{ color: "var(--gold-bright)" }} />
          <h2 className="font-display text-[2rem]" style={{ color: "var(--ivory)" }}>Admin Login</h2>
        </div>
        <p className="text-sm mb-6 text-center" style={{ color: "rgba(246,239,224,.62)" }}>
          Authorized personnel only · /admin
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(246,239,224,.62)" }} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full rounded-md pl-10 pr-3 py-3 text-[0.95rem]" style={{ background: "rgba(28,16,27,.5)", border: "1px solid var(--paper-line)", color: "var(--ivory)" }} />
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(246,239,224,.62)" }} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="w-full rounded-md pl-10 pr-3 py-3 text-[0.95rem]" style={{ background: "rgba(28,16,27,.5)", border: "1px solid var(--paper-line)", color: "var(--ivory)" }} />
          </div>
          {err && <div className="text-sm font-semibold text-center" style={{ color: "var(--anaar-bright)" }}>{err}</div>}
          <button type="submit" disabled={loading} className="glossy-btn-gold w-full py-3 rounded-md font-semibold tracking-[0.03em] text-[0.95rem] disabled:opacity-60">
            {loading ? "Authenticating…" : "Login to Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
