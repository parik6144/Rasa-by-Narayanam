"use client";
import { useState, useEffect } from "react";
import { useApp } from "@/store/app-store";
import { CONFIG } from "@/lib/rasa-data";
import { Menu, X } from "lucide-react";

export default function Nav() {
  const { user, setAuthModal, setView, view } = useApp();
  const [solid, setSolid] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goSection = (id: string) => {
    setMobileOpen(false);
    if (view !== "landing") {
      setView("landing");
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all"
      style={{
        background: solid ? "rgba(28,16,27,.86)" : "transparent",
        backdropFilter: solid ? "blur(14px) saturate(1.2)" : "none",
        WebkitBackdropFilter: solid ? "blur(14px) saturate(1.2)" : "none",
        borderBottom: solid ? "1px solid rgba(198,152,58,.18)" : "1px solid transparent",
      }}
    >
      <div className="max-w-[1220px] mx-auto px-5 sm:px-7 flex items-center justify-between h-[74px]">
        <button onClick={() => setView("landing")} className="flex items-center gap-3">
          <img src={CONFIG.logo} alt="Rasa by Narayanam" className="h-[52px] w-auto logo-glow" />
        </button>

        <nav className="hidden md:flex items-center gap-[34px]">
          <button onClick={() => goSection("story")} className="text-[0.83rem] tracking-[0.04em] hover:text-white transition-colors" style={{ color: "rgba(246,239,224,.62)" }}>Story</button>
          <button onClick={() => goSection("why")} className="text-[0.83rem] tracking-[0.04em] hover:text-white transition-colors" style={{ color: "rgba(246,239,224,.62)" }}>Why Rasa</button>
          <button onClick={() => goSection("packages")} className="text-[0.83rem] tracking-[0.04em] hover:text-white transition-colors" style={{ color: "rgba(246,239,224,.62)" }}>Packages</button>
          <button onClick={() => goSection("addons")} className="text-[0.83rem] tracking-[0.04em] hover:text-white transition-colors" style={{ color: "rgba(246,239,224,.62)" }}>Add-ons</button>
          <button onClick={() => goSection("how")} className="text-[0.83rem] tracking-[0.04em] hover:text-white transition-colors" style={{ color: "rgba(246,239,224,.62)" }}>How</button>
          <button onClick={() => goSection("reviews")} className="text-[0.83rem] tracking-[0.04em] hover:text-white transition-colors" style={{ color: "rgba(246,239,224,.62)" }}>Reviews</button>
          <button onClick={() => goSection("faq")} className="text-[0.83rem] tracking-[0.04em] hover:text-white transition-colors" style={{ color: "rgba(246,239,224,.62)" }}>FAQ</button>
          <button onClick={() => goSection("contact")} className="text-[0.83rem] tracking-[0.04em] hover:text-white transition-colors" style={{ color: "rgba(246,239,224,.62)" }}>Contact</button>
          {user ? (
            <button onClick={() => setView("user-dashboard")} className="glossy-btn-gold px-5 py-2 rounded-full text-[0.83rem] font-medium tracking-[0.06em]">
              My Dashboard
            </button>
          ) : (
            <button onClick={() => setAuthModal("login")} className="glossy-btn-gold px-5 py-2 rounded-full text-[0.83rem] font-medium tracking-[0.06em]">
              Login / Register
            </button>
          )}
        </nav>

        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" style={{ color: "var(--ivory)" }} /> : <Menu className="w-6 h-6" style={{ color: "var(--ivory)" }} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden absolute top-[74px] left-0 right-0 mirror-panel border-t" style={{ borderColor: "var(--paper-line)" }}>
          <div className="flex flex-col p-6 gap-4">
            {[
              { id: "story", label: "Story" },
              { id: "why", label: "Why Rasa" },
              { id: "packages", label: "Packages" },
              { id: "addons", label: "Add-ons" },
              { id: "how", label: "How It Works" },
              { id: "reviews", label: "Reviews" },
              { id: "faq", label: "FAQ" },
              { id: "contact", label: "Contact" },
            ].map((s) => (
              <button key={s.id} onClick={() => goSection(s.id)} className="text-left text-base" style={{ color: "var(--ivory)" }}>
                {s.label}
              </button>
            ))}
            {user ? (
              <button onClick={() => { setMobileOpen(false); setView("user-dashboard"); }} className="glossy-btn-gold px-5 py-2 rounded-full text-sm font-medium">
                My Dashboard
              </button>
            ) : (
              <button onClick={() => { setMobileOpen(false); setAuthModal("login"); }} className="glossy-btn-gold px-5 py-2 rounded-full text-sm font-medium">
                Login / Register
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
