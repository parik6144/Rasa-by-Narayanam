"use client";
import { useState, useMemo } from "react";
import { useCatalog } from "@/store/catalog-store";
import type { Addon } from "@/lib/rasa-data";
import { useApp } from "@/store/app-store";
import { addonCategoryImage } from "@/lib/site-images";
import { ArrowRight } from "lucide-react";

export default function Addons() {
  const { addons } = useCatalog();
  const { openMenuBuilder } = useApp();
  const { packages } = useCatalog();
  const categories = useMemo(() => Array.from(new Set(addons.map((a) => a.category))), [addons]);
  const [active, setActive] = useState(categories[0] || "");
  const [search, setSearch] = useState("");

  // Keep active in sync when catalog loads
  const activeCat = categories.includes(active) ? active : categories[0] || "";

  const list = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return addons.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      );
    }
    return addons.filter((a) => a.category === activeCat);
  }, [addons, activeCat, search]);

  const defaultPkg = packages[0]?.id;

  return (
    <section className="py-[104px]" id="addons" style={{
      background:
        "radial-gradient(60% 40% at 80% 0%,rgba(198,152,58,.16),transparent 60%), radial-gradient(50% 30% at 20% 100%,rgba(156,42,56,.20),transparent 60%), linear-gradient(180deg,#1f1220,#241423)",
    }}>
      <div className="max-w-[1220px] mx-auto px-5 sm:px-7">
        <div className="mb-10 max-w-[640px]">
          <div className="text-[0.72rem] font-semibold tracking-[0.32em] uppercase mb-2" style={{ color: "var(--gold)" }}>Beyond the Package</div>
          <h2 className="font-display mb-4" style={{ fontSize: "clamp(2.1rem,4.4vw,3.5rem)", color: "var(--ivory)" }}>The Add-ons Catalogue</h2>
          <p className="text-[1.06rem] font-light" style={{ color: "rgba(246,239,224,.62)" }}>
            Live global stations, regional thalis, a mithai studio, a frozen theatre, paan parlour, and a full{" "}
            <b style={{ color: "var(--ivory)" }}>Mansahari (non-veg)</b> à la carte — added to any package whenever a guest wants a little more.
            <br /><span className="text-[0.86rem]" style={{ color: "rgba(246,239,224,.42)" }}>{addons.length} items across {categories.length} categories.</span>
          </p>
          {defaultPkg && (
            <button
              onClick={() => openMenuBuilder(defaultPkg)}
              className="mt-5 glossy-btn-gold inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-semibold text-[0.88rem]"
            >
              Try with a package <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search add-ons (e.g. dim sum, chicken, kulfi, chaat...)"
            className="glass-input w-full rounded-md px-4 py-3 text-[0.92rem]"
          />
        </div>

        {!search && (
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((c) => {
              const catNonVeg = c.toLowerCase().includes("mansahari");
              const count = addons.filter((a) => a.category === c).length;
              return (
                <button
                  key={c}
                  onClick={() => setActive(c)}
                  className="px-4 py-2.5 rounded-full text-[0.82rem] font-medium tracking-[0.02em] transition-all flex items-center gap-2"
                  style={activeCat === c
                    ? { background: "linear-gradient(180deg,#FFE5A0,#C6983A)", color: "#231318", fontWeight: 600 }
                    : { border: "1px solid var(--paper-line)", color: "rgba(246,239,224,.62)" }
                  }
                >
                  {catNonVeg && <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#c0392b" }} />}
                  {c}
                  <span className="text-[0.66rem] opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {!search && activeCat && (
          <div className="relative rounded-lg overflow-hidden mb-8" style={{ border: "1px solid var(--paper-line)", height: 160 }}>
            <img
              src={addonCategoryImage(activeCat)}
              alt={activeCat}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div
              className="absolute inset-0 flex items-end"
              style={{ background: "linear-gradient(180deg, transparent 20%, rgba(26,15,25,.82) 100%)" }}
            >
              <div className="p-5">
                <div className="text-[0.68rem] tracking-[0.22em] uppercase mb-1" style={{ color: "var(--gold-bright)" }}>Now browsing</div>
                <div className="font-display text-[1.35rem]" style={{ color: "var(--ivory)" }}>{activeCat}</div>
              </div>
            </div>
          </div>
        )}

        {list.length === 0 ? (
          <div className="text-center py-12" style={{ color: "rgba(246,239,224,.62)" }}>
            No add-ons found. Try a different search.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-x-[60px] gap-y-0">
            {list.map((a: Addon) => (
              <div key={a.id} className="py-[18px] border-b" style={{ borderColor: "var(--paper-line)" }}>
                <div className="flex justify-between gap-[18px] items-baseline">
                  <div className="font-display text-[1.15rem] flex items-center gap-2" style={{ color: "var(--ivory)" }}>
                    {a.name}
                    {a.nv && (
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-sm text-[0.6rem] font-bold" style={{ background: "#c0392b", color: "#fff" }} title="Non-veg">
                        NV
                      </span>
                    )}
                  </div>
                  <div className="text-[0.84rem] font-semibold whitespace-nowrap text-right" style={{ color: "var(--gold-bright)" }}>
                    ₹{a.price.toLocaleString("en-IN")}{a.priceType === "per_guest" ? "/guest" : a.priceType === "per_event" ? "/event" : a.priceType === "per_variety" ? "/variety" : ""}
                  </div>
                </div>
                {a.description && (
                  <div className="text-[0.86rem] font-light mt-1" style={{ color: "rgba(246,239,224,.62)" }}>{a.description}</div>
                )}
                {a.choices && a.choices.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {a.choices.map((ch) => (
                      <span key={ch} className="text-[0.72rem] px-2 py-0.5 rounded-full" style={{ background: "rgba(198,152,58,.08)", border: "1px solid var(--paper-line)", color: "rgba(246,239,224,.62)" }}>
                        {ch}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
