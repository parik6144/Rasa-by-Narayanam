"use client";

const TRUST_ITEMS = [
  { num: "100+", label: "Dishes", sub: "Vast à la carte menu" },
  { num: "100", label: "Guests", sub: "Minimum order" },
  { num: "Hygienic", label: "Kitchen", sub: "Professionally run" },
  { num: "Professional", label: "Chefs", sub: "Trained & consistent" },
];

export default function TrustStrip() {
  return (
    <section className="py-8" style={{ background: "var(--ink)", borderBottom: "1px solid var(--paper-line)" }}>
      <div className="max-w-[1220px] mx-auto px-5 sm:px-7">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {TRUST_ITEMS.map((t, i) => (
            <div key={i} className="text-center md:text-left">
              <div className="font-display text-[1.6rem] leading-tight gold-text">{t.num}</div>
              <div className="text-[0.92rem] font-medium mt-0.5" style={{ color: "var(--ivory)" }}>{t.label}</div>
              <div className="text-[0.76rem] font-light" style={{ color: "rgba(246,239,224,.5)" }}>{t.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
