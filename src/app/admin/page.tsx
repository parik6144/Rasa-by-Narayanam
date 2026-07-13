"use client";
import { useEffect } from "react";
import { useApp } from "@/store/app-store";
import AdminLogin from "@/components/rasa/admin-login";
import AdminDashboard from "@/components/rasa/admin-dashboard";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const { user, setUser, hydrateUser, sessionChecked, setSessionChecked, toast, setToast } = useApp();
  const { toast: showToast } = useToast();

  useEffect(() => {
    hydrateUser();
    let cancelled = false;
    const startedAt = Date.now();

    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;

        if (data.user) {
          setUser(data.user);
        } else {
          // Cookie missing — clear ONLY if user wasn't set by a login that finished after this check started
          const { user: live, userUpdatedAt } = useApp.getState();
          if (userUpdatedAt > startedAt && live) {
            return;
          }
          setUser(null);
        }
      } catch {
        // Network error: keep hydrated / current user
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrateUser, setUser, setSessionChecked]);

  useEffect(() => {
    if (toast) {
      showToast({ title: toast });
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast, showToast, setToast]);

  const isAdmin = !!user && user.role === "admin";

  if (!sessionChecked && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(180deg,#1c101b,#251526)", color: "rgba(246,239,224,.62)" }}>
        Loading…
      </div>
    );
  }

  if (!isAdmin) {
    return <AdminLogin />;
  }

  return <AdminDashboard />;
}
