"use client";
import { useApp } from "@/store/app-store";
import { CONFIG, TASTE_DOTS } from "@/lib/rasa-data";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  const { setView } = useApp();
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section className="relative min-h-screen flex items-center pt-[120px] pb-[70px] overflow-hidden" style={{
      background:
        "radial-gradient(120% 90% at 78% 8%,rgba(156,42,56,.34),transparent 55%), radial-gradient(90% 80% at 12% 100%,rgba(198,152,58,.16),transparent 60%), linear-gradient(180deg,#1c101b 0%,#221421 55%,#2a1a29 100%)",
    }}>
      <div className="hero-grain" aria-hidden="true" />
      <div aria-hidden="true" className="absolute right-0 top-1/2 -translate-y-1/2 font-deva pointer-events-none select-none"
        style={{ fontSize: "clamp(20rem,46vw,50rem)", lineHeight: 1, color: "transparent", WebkitTextStroke: "1.5px rgba(226,182,88,.16)" }}>
        रस
      </div>

      <div className="relative z-10 max-w-[1220px] mx-auto px-5 sm:px-7 max-w-[860px]">
        <img src={CONFIG.logo} alt="Rasa by Narayanam" className="logo-glow mb-6" style={{ height: "clamp(88px, 12vw, 140px)", width: "auto" }} />
        <div className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full" style={{
          border: "1px solid var(--paper-line)", background: "rgba(198,152,58,.1)",
        }}>
          <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: "var(--gold-bright)" }} />
          <span className="text-[0.78rem] tracking-[0.02em] font-medium" style={{ color: "var(--gold-bright)" }}>
            Kitchen live {CONFIG.launchDate} · Now taking bookings
          </span>
        </div>

        <div className="text-[0.72rem] font-semibold tracking-[0.32em] uppercase mb-2" style={{ color: "var(--gold)" }}>
          Premium Catering · Honestly Priced
        </div>

        <h1 className="font-display font-normal leading-[1.06] tracking-[-0.025em] mb-4" style={{ fontSize: "clamp(2.9rem,7.6vw,6.4rem)" }}>
          <span className="block">The essence of a feast,</span>
          <span className="block italic gold-text">within reach.</span>
        </h1>

        <p className="text-[clamp(1.02rem,1.7vw,1.24rem)] font-light max-w-[600px] mb-9" style={{ color: "rgba(246,239,224,.62)" }}>
          Premium celebration catering, reimagined. Every dish is prepared in a{" "}
          <span className="font-medium" style={{ color: "var(--ivory)" }}>fully hygienic kitchen</span> by{" "}
          <span className="font-medium" style={{ color: "var(--ivory)" }}>highly trained chefs</span> — then served with grace,
          without the frills, at honestly fair rates.
        </p>

        <div className="flex flex-wrap gap-4">
          <button onClick={() => scrollTo("packages")} className="glossy-btn-gold inline-flex items-center gap-2 px-[30px] py-[15px] rounded-[44px] text-[0.92rem] font-semibold tracking-[0.03em]">
            Explore the Packages
            <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => scrollTo("story")} className="glossy-btn-ghost px-[30px] py-[15px] rounded-[44px] text-[0.92rem] font-semibold tracking-[0.03em]">
            Our Story
          </button>
        </div>

        <div className="flex flex-wrap gap-0 mt-16 pt-[22px] border-t" style={{ borderColor: "var(--paper-line)" }}>
          {TASTE_DOTS.map((t) => (
            <div key={t.en} className="flex-1 min-w-[110px] py-1.5 pr-4">
              <span className={`taste-dot ${t.cls} mr-2`} />
              <span className="font-display italic text-[1.06rem]">{t.en}</span>
              <span className="block text-[0.66rem] tracking-[0.24em] uppercase mt-[3px] pl-[18px]" style={{ color: "rgba(246,239,224,.62)" }}>{t.sa}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
