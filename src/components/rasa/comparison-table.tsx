"use client";
import { useCatalog } from "@/store/catalog-store";
import { parseSelection } from "@/lib/selection";
import type { Package } from "@/lib/rasa-data";
import { Check } from "lucide-react";
import { useApp } from "@/store/app-store";

function countLabel(s: string): string {
  const n = parseSelection(s);
  if (n === 999) return "All";
  if (n === 0) return "✓";
  return String(n);
}

export default function ComparisonTable() {
  const { packages } = useCatalog();
  const { openMenuBuilder } = useApp();

  const features = [
    { label: "Price per guest", getValue: (p: Package) => `₹${p.price}` },
    { label: "Courses", getValue: (p: Package) => String(p.sections.length) },
    { label: "Dishes to choose from", getValue: (p: Package) => `${p.sections.reduce((s, sec) => s + sec.dishes.length, 0)}+` },
    { label: "Welcome drinks", getValue: (p: Package) => {
      const s = p.sections.find(sec => sec.section.toLowerCase().includes("welcome"));
      return s ? countLabel(s.selection) : "—";
    }},
    { label: "Rotational starters", getValue: (p: Package) => {
      const s = p.sections.find(sec => sec.section.toLowerCase().includes("starter"));
      return s ? countLabel(s.selection) : "—";
    }},
    { label: "Live stations", getValue: (p: Package) => {
      const s = p.sections.find(sec => sec.section.toLowerCase().includes("live"));
      return s ? countLabel(s.selection) : "—";
    }},
    { label: "Soups", getValue: (p: Package) => {
      const s = p.sections.find(sec => sec.section.toLowerCase().includes("soup"));
      return s ? countLabel(s.selection) : "—";
    }},
    { label: "Curries", getValue: (p: Package) => {
      const s = p.sections.find(sec => sec.section.toLowerCase().includes("curry") || sec.section.toLowerCase().includes("curries") || sec.section.toLowerCase().includes("punjab"));
      return s ? countLabel(s.selection) : "—";
    }},
    { label: "Dal", getValue: (p: Package) => {
      const s = p.sections.find(sec => sec.section.toLowerCase().includes("dal"));
      return s ? countLabel(s.selection) : "—";
    }},
    { label: "Biryani / Pulao", getValue: (p: Package) => {
      const s = p.sections.find(sec => sec.section.toLowerCase().includes("biryani"));
      return s ? countLabel(s.selection) : "—";
    }},
    { label: "Indian breads", getValue: (p: Package) => {
      const s = p.sections.find(sec => sec.section.toLowerCase().includes("bread"));
      return s ? countLabel(s.selection) : "—";
    }},
    { label: "Desserts", getValue: (p: Package) => {
      const s = p.sections.find(sec => sec.section.toLowerCase().includes("dessert"));
      return s ? countLabel(s.selection) : "—";
    }},
    { label: "Mukshodhan (complimentary)", getValue: () => "✓" },
    { label: "Add-ons catalogue", getValue: () => "✓" },
    { label: "Minimum 100 guests", getValue: () => "✓" },
  ];

  if (!packages.length) return null;

  return (
    <section className="py-[80px]" id="compare">
      <div className="max-w-[1220px] mx-auto px-5 sm:px-7">
        <div className="mb-10 text-center">
          <div className="text-[0.72rem] font-semibold tracking-[0.32em] uppercase mb-2" style={{ color: "var(--gold)" }}>Compare</div>
          <h2 className="font-display mb-3" style={{ fontSize: "clamp(1.8rem,3.6vw,2.8rem)", color: "var(--ivory)" }}>Five packages, side by side.</h2>
          <p className="text-[0.95rem] font-light" style={{ color: "rgba(246,239,224,.62)" }}>See exactly what each tier includes — pick the one that fits your celebration.</p>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse", background: "rgba(34,20,33,0.5)", borderRadius: "12px", overflow: "hidden" }}>
            <thead>
              <tr>
                <th className="text-left p-4 text-[0.72rem] tracking-[0.14em] uppercase font-bold" style={{ color: "rgba(246,239,224,.5)", background: "rgba(28,16,27,0.8)", borderBottom: "1px solid var(--paper-line)" }}>Feature</th>
                {packages.map((p) => (
                  <th key={p.id} className="text-center p-4" style={{ background: p.featured ? "rgba(198,152,58,0.12)" : "rgba(28,16,27,0.8)", borderBottom: "1px solid var(--paper-line)" }}>
                    <div className="font-display text-[1rem]" style={{ color: p.featured ? "var(--gold-bright)" : "var(--ivory)" }}>{p.name}</div>
                    <div className="font-display text-[1.4rem] mt-1" style={{ color: "var(--gold-bright)" }}>₹{p.price}</div>
                    <div className="text-[0.66rem] tracking-[0.1em] uppercase" style={{ color: "rgba(246,239,224,.42)" }}>per guest</div>
                    <button
                      onClick={() => openMenuBuilder(p.id)}
                      className="mt-2 text-[0.68rem] font-semibold tracking-[0.08em] uppercase px-3 py-1 rounded-full"
                      style={{ background: "rgba(198,152,58,.2)", color: "var(--gold-bright)" }}
                    >
                      Try menu
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((f, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(198,152,58,0.12)" }}>
                  <td className="p-3 text-[0.84rem] font-medium" style={{ color: "rgba(246,239,224,.72)", background: i % 2 === 0 ? "rgba(28,16,27,0.3)" : "transparent" }}>{f.label}</td>
                  {packages.map((p) => {
                    const val = f.getValue(p);
                    const isCheck = val === "✓";
                    return (
                      <td key={p.id} className="text-center p-3 text-[0.86rem]" style={{
                        color: isCheck ? "#1f7a5c" : "var(--ivory)",
                        background: p.featured ? "rgba(198,152,58,0.04)" : (i % 2 === 0 ? "rgba(28,16,27,0.3)" : "transparent"),
                        fontWeight: isCheck ? 700 : 400,
                      }}>
                        {isCheck ? <Check className="w-4 h-4 mx-auto" strokeWidth={3} /> : val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-4">
          {packages.map((p) => (
            <div key={p.id} className="glossy-card rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-display text-[1.2rem]" style={{ color: p.featured ? "var(--gold-bright)" : "var(--ivory)" }}>{p.name}</div>
                <div className="font-display text-[1.6rem]" style={{ color: "var(--gold-bright)" }}>₹{p.price}<span className="text-[0.7rem] font-normal" style={{ color: "rgba(246,239,224,.5)" }}>/guest</span></div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[0.82rem] mb-4">
                {features.map((f, i) => {
                  const val = f.getValue(p);
                  return (
                    <div key={i} className="flex justify-between gap-2 py-1 border-b" style={{ borderColor: "rgba(198,152,58,0.1)" }}>
                      <span style={{ color: "rgba(246,239,224,.5)" }}>{f.label}</span>
                      <span style={{ color: val === "✓" ? "#1f7a5c" : "var(--ivory)", fontWeight: val === "✓" ? 700 : 400 }}>{val}</span>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => openMenuBuilder(p.id)} className="glossy-btn-gold w-full py-2.5 rounded-md font-semibold text-[0.86rem]">
                Customize this package
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
