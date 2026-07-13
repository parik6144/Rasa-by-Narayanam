"use client";
import { useApp } from "@/store/app-store";
import { useCatalog } from "@/store/catalog-store";
import { ArrowRight, Loader2 } from "lucide-react";

export default function Packages() {
  const { openMenuBuilder } = useApp();
  const { packages, loading, loaded } = useCatalog();

  return (
    <section className="py-[104px]" id="packages">
      <div className="max-w-[1220px] mx-auto px-5 sm:px-7">
        <div className="mb-14 max-w-[720px]">
          <div className="text-[0.72rem] font-semibold tracking-[0.32em] uppercase mb-2" style={{ color: "var(--gold)" }}>The Packages</div>
          <h2 className="font-display mb-4" style={{ fontSize: "clamp(2.1rem,4.4vw,3.5rem)", color: "var(--ivory)" }}>Five tables, one standard.</h2>
          <p className="text-[1.06rem] font-light" style={{ color: "rgba(246,239,224,.62)" }}>
            Each package sets a per-guest price and a generous set of choices. Tap one to open its menu builder — tick your dishes course by course, add custom dishes if you want, then send your complete menu to us on WhatsApp or email.
          </p>
        </div>

        {loading && !loaded && (
          <div className="flex items-center justify-center gap-2 py-16" style={{ color: "rgba(246,239,224,.62)" }}>
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading packages from kitchen…
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-[22px]">
          {packages.map((p) => {
            const totalDishes = p.sections.reduce((sum, s) => sum + s.dishes.length, 0);
            return (
              <div
                key={p.id}
                className="glossy-card rounded-md p-[34px_28px_30px] flex flex-col relative"
                style={p.featured ? { borderColor: "rgba(226,182,88,.6)" } : undefined}
              >
                {p.featured && (
                  <span className="absolute top-4 right-4 text-[0.6rem] tracking-[0.2em] uppercase px-[10px] py-1 rounded-full font-bold glossy-btn-gold z-10" style={{ color: "#231318" }}>
                    Most Loved
                  </span>
                )}
                <div className="font-display text-[1.62rem] mb-1" style={{ color: "var(--ivory)" }}>{p.name}</div>
                <div className="font-display italic text-[1rem] mb-3" style={{ color: "var(--gold-bright)" }}>{p.tagline}</div>

                <div className="font-display text-[2.7rem] my-[18px_0_2px]" style={{ color: "var(--ivory)" }}>
                  ₹{p.price}
                  <span className="block text-[0.8rem] tracking-[0.1em] font-normal mt-[-2px]" style={{ color: "rgba(246,239,224,.62)" }}>per guest</span>
                </div>
                <div className="text-[0.76rem] font-medium mt-2 mb-4" style={{ color: "var(--gold-bright)" }}>
                  Min {p.minGuests || 100} guests · {p.sections.length} courses · {totalDishes} dishes
                </div>
                <div className="text-[0.82rem] flex-1 mb-[22px]" style={{ color: "rgba(246,239,224,.62)" }}>
                  {p.sections.map((s, si) => (
                    <div key={`${p.id}-sec-${si}`} className="mb-1">
                      <b style={{ color: "var(--gold-bright)", fontWeight: 600 }}>{s.selection}</b> · {s.section}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => openMenuBuilder(p.id)}
                  className="glossy-btn-gold w-full py-3 rounded-md font-semibold tracking-[0.03em] text-[0.92rem] flex items-center justify-center gap-2"
                >
                  Customize Menu
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-center mt-10 text-[0.92rem] font-light" style={{ color: "rgba(246,239,224,.62)" }}>
          Want more than the package holds? Everything in our{" "}
          <a href="#addons" className="font-semibold" style={{ color: "var(--gold-bright)" }}>Add-ons catalogue</a> can be served on top, on a per-guest or per-event basis.
        </p>
      </div>
    </section>
  );
}
