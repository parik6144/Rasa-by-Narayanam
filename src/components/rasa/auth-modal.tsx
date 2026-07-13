"use client";
import { useState } from "react";
import { useApp } from "@/store/app-store";
import { X, Mail, Lock, User as UserIcon, Phone, MapPin } from "lucide-react";

export default function AuthModal() {
  const { authModal, setAuthModal, setUser, setView, setToast, view } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (authModal === "none") return null;
  const isRegister = authModal === "register";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      if (isRegister) {
        const digits = phone.replace(/\D/g, "");
        if (digits.length < 10) throw new Error("Please enter a valid 10-digit phone number");
      }
      const res = await fetch(`/api/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(isRegister ? { name, email, password, phone, city } : { email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Auth failed");
      setUser(data.user);
      setAuthModal("none");
      setToast(isRegister ? "Welcome to Rasa!" : "Logged in successfully");
      // Stay in booking wizard if mid-booking; otherwise go to dashboard
      if (view !== "booking") setView("user-dashboard");
      setEmail(""); setPassword(""); setName(""); setPhone(""); setCity("");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-5" style={{ background: "rgba(14,7,13,.74)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)" }}>
      <div className="glass-panel-ivory rounded-xl p-8 w-full max-w-[460px] relative max-h-[90vh] overflow-y-auto">
        <button onClick={() => setAuthModal("none")} className="absolute top-4 right-4 w-[34px] h-[34px] rounded-full border flex items-center justify-center transition-colors hover:bg-red-700 hover:text-white hover:border-red-700" style={{ border: "1px solid rgba(58,39,51,.2)", color: "#2c1a26" }}>
          <X className="w-4 h-4" />
        </button>
        <h3 className="font-display text-[1.9rem] mb-1" style={{ color: "#2c1a26" }}>
          {isRegister ? "Create your account" : "Welcome back"}
        </h3>
        <p className="text-[0.92rem] mb-6 font-light" style={{ color: "var(--on-ivory-dim)" }}>
          {isRegister ? "Join Rasa to book your celebration." : "Login to manage your bookings."}
        </p>
        <form onSubmit={submit} className="space-y-3">
          {isRegister && (
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required className="w-full rounded-md pl-10 pr-3 py-3 text-[0.95rem] border" style={{ background: "#fff", color: "#2c1a26", borderColor: "rgba(58,39,51,.22)" }} />
            </div>
          )}
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full rounded-md pl-10 pr-3 py-3 text-[0.95rem] border" style={{ background: "#fff", color: "#2c1a26", borderColor: "rgba(58,39,51,.22)" }} />
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 chars)" required minLength={6} className="w-full rounded-md pl-10 pr-3 py-3 text-[0.95rem] border" style={{ background: "#fff", color: "#2c1a26", borderColor: "rgba(58,39,51,.22)" }} />
          </div>
          {isRegister && (
            <>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number *"
                  required
                  inputMode="tel"
                  className="w-full rounded-md pl-10 pr-3 py-3 text-[0.95rem] border"
                  style={{ background: "#fff", color: "#2c1a26", borderColor: "rgba(58,39,51,.22)" }}
                />
              </div>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City (optional)" className="w-full rounded-md pl-10 pr-3 py-3 text-[0.95rem] border" style={{ background: "#fff", color: "#2c1a26", borderColor: "rgba(58,39,51,.22)" }} />
              </div>
            </>
          )}
          {err && <div className="text-sm font-semibold text-red-700 text-center">{err}</div>}
          <button type="submit" disabled={loading} className="glossy-btn-gold w-full py-3 rounded-md font-semibold tracking-[0.03em] text-[0.95rem] disabled:opacity-60">
            {loading ? "Please wait…" : (isRegister ? "Create account" : "Login")}
          </button>
        </form>
        <div className="text-center mt-5 text-[0.82rem]" style={{ color: "var(--on-ivory-dim)" }}>
          {isRegister ? "Already have an account? " : "New to Rasa? "}
          <button
            onClick={() => setAuthModal(isRegister ? "login" : "register")}
            className="font-semibold"
            style={{ color: "var(--anaar)" }}
          >
            {isRegister ? "Login instead" : "Create an account"}
          </button>
        </div>
        <div className="mt-4 pt-4 border-t text-center text-[0.74rem]" style={{ borderColor: "rgba(58,39,51,.14)", color: "var(--on-ivory-dim)" }}>
          Customer login for bookings & quotations
        </div>
      </div>
    </div>
  );
}
