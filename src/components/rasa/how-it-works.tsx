"use client";
import { ArrowRight } from "lucide-react";

const STEPS = [
  { num: "i.", title: "Enquiry", body: "Share your date, headcount and occasion. Build a menu here or just tell us your vision." },
  { num: "ii.", title: "Menu Finalisation", body: "We refine your courses together and confirm a transparent, per-guest quotation." },
  { num: "iii.", title: "Event Execution", body: "Our team sets up, serves gracefully and clears — you simply enjoy the celebration." },
];

export default function HowItWorks() {
  return (
    <section className="py-[104px] ivory-gradient" id="how" style={{ color: "#3a2733" }}>
      <div className="max-w-[1220px] mx-auto px-5 sm:px-7">
        <div className="mb-14 max-w-[720px]">
          <div className="text-[0.72rem] font-semibold tracking-[0.32em] uppercase mb-2" style={{ color: "var(--anaar)" }}>How It Works</div>
          <h2 className="font-display mb-4" style={{ fontSize: "clamp(2.1rem,4.4vw,3.5rem)", color: "#2c1a26" }}>From enquiry to feast.</h2>
          <p className="text-[1.06rem] font-light" style={{ color: "var(--on-ivory-dim)" }}>
            Three simple steps — we keep it clear and unhurried, so your celebration is the only thing you think about.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-[60px] left-[15%] right-[15%] h-[1px]" style={{ background: "linear-gradient(90deg, transparent, var(--gold), transparent)" }} />
          {STEPS.map((s, i) => (
            <div key={i} className="text-center relative">
              <div className="w-[120px] h-[120px] mx-auto rounded-full flex items-center justify-center mb-5 relative z-10" style={{
                background: "linear-gradient(135deg, #F6EFE0, #EEE3CF)",
                border: "2px solid var(--gold)",
                boxShadow: "0 10px 30px -10px rgba(198,152,58,0.4), inset 0 1px 0 rgba(255,255,255,0.5)",
              }}>
                <span className="font-display italic text-[2.4rem]" style={{ color: "var(--gold)" }}>{s.num}</span>
              </div>
              <h4 className="font-display text-[1.4rem] mb-2" style={{ color: "#2c1a26" }}>{s.title}</h4>
              <p className="text-[0.95rem] font-light max-w-[280px] mx-auto" style={{ color: "var(--on-ivory-dim)" }}>{s.body}</p>
              {i < STEPS.length - 1 && (
                <div className="hidden md:flex items-center justify-center mt-4">
                  <ArrowRight className="w-5 h-5" style={{ color: "var(--gold)", opacity: 0.4 }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
