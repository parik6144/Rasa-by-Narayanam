"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useApp } from "@/store/app-store";
import { useCatalog } from "@/store/catalog-store";
import { CONFIG } from "@/lib/rasa-data";
import { parseSelection, isSectionComplete } from "@/lib/selection";
import { addonLineTotal, addonMinGuestsBadge, addonPricingNote } from "@/lib/addon-pricing";
import { X, Plus, Check, ArrowRight, ArrowLeft, Minus, Sparkles, Share2, Info } from "lucide-react";

export default function MenuBuilder() {
  const { menuBuilderPkgId, closeMenuBuilder, activeQuotation, setActiveQuotation, setQuotationPanel, user, setAuthModal, setToast } = useApp();
  const { getPackage, addons } = useCatalog();
  const [activeTab, setActiveTab] = useState<"menu" | "addons" | "custom">("menu");
  const [customDishInput, setCustomDishInput] = useState("");
  const [customSection, setCustomSection] = useState("Main Course");
  const [sectionIndex, setSectionIndex] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  const pkg = useMemo(() => (menuBuilderPkgId ? getPackage(menuBuilderPkgId) : undefined), [menuBuilderPkgId, getPackage]);
  const addonCategories = useMemo(() => Array.from(new Set(addons.map((a) => a.category))), [addons]);
  const [addonCat, setAddonCat] = useState("");

  useEffect(() => {
    if (pkg && activeQuotation.packageId !== pkg.id) {
      setActiveQuotation({ packageId: pkg.id, selectedDishes: {}, selectedAddons: [], addonChoices: {}, customDishes: [] });
      setSectionIndex(0);
      setActiveTab("menu");
    }
  }, [pkg, activeQuotation.packageId, setActiveQuotation]);

  if (!menuBuilderPkgId || !pkg) return null;

  const selected = activeQuotation.selectedDishes;
  const selectedAddons = activeQuotation.selectedAddons;
  const customDishes: string[] = activeQuotation.customDishes || [];
  const sections = pkg.sections;
  const current = sections[sectionIndex];

  const toggleDish = (section: string, dish: string, max: number) => {
    const cur = selected[section] || [];
    let next: string[];
    if (cur.includes(dish)) next = cur.filter((d) => d !== dish);
    else if (max >= 999) next = cur.includes(dish) ? cur : [...cur, dish];
    else if (cur.length >= max) next = [...cur.slice(1), dish];
    else next = [...cur, dish];
    setActiveQuotation({ selectedDishes: { ...selected, [section]: next } });
  };

  const toggleAddon = (id: string) => {
    if (selectedAddons.includes(id)) {
      setActiveQuotation({ selectedAddons: selectedAddons.filter((a) => a !== id) });
    } else {
      setActiveQuotation({ selectedAddons: [...selectedAddons, id] });
    }
  };

  const toggleAddonChoice = (addonId: string, choice: string) => {
    const cur = activeQuotation.addonChoices[addonId];
    const nextChoice = cur === choice ? null : choice;
    setActiveQuotation({
      selectedAddons: selectedAddons.includes(addonId) ? selectedAddons : [...selectedAddons, addonId],
      addonChoices: {
        ...activeQuotation.addonChoices,
        [addonId]: nextChoice,
      },
    });
  };

  const addCustomDish = () => {
    if (!customDishInput.trim()) return;
    setActiveQuotation({
      customDishes: [...customDishes, `${customSection}: ${customDishInput.trim()}`],
    });
    setCustomDishInput("");
    setToast(`Added: ${customDishInput.trim()}`);
  };

  const removeCustomDish = (idx: number) => {
    setActiveQuotation({ customDishes: customDishes.filter((_, i) => i !== idx) });
  };

  const calcTotal = () => {
    const pkgTotal = pkg.price * activeQuotation.guests;
    const addonsTotal = selectedAddons.reduce((sum, id) => {
      const a = addons.find((x) => x.id === id);
      if (!a) return sum;
      return sum + addonLineTotal(a, activeQuotation.guests);
    }, 0);
    const subtotal = pkgTotal + addonsTotal;
    const gst = Math.round(subtotal * 0.05);
    return { pkgTotal, addonsTotal, subtotal, gst, total: subtotal + gst };
  };

  const { pkgTotal, addonsTotal, gst, total } = calcTotal();
  const advance = Math.round(total * (CONFIG.advancePercent / 100));

  const requiredSections = sections.filter((s) => {
    const max = parseSelection(s.selection);
    return max !== 0 && max !== 999; // skip complimentary & all-included for "required picks"
  });
  const completedSections = requiredSections.filter((s) =>
    isSectionComplete(s.selection, (selected[s.section] || []).length, s.dishes.length)
  );
  const completionPct = requiredSections.length > 0
    ? Math.round((completedSections.length / requiredSections.length) * 100)
    : 100;

  const currentComplete = current
    ? isSectionComplete(current.selection, (selected[current.section] || []).length, current.dishes.length)
    : true;

  const nextIncompleteIndex = sections.findIndex((s, i) => {
    if (i <= sectionIndex) return false;
    return !isSectionComplete(s.selection, (selected[s.section] || []).length, s.dishes.length);
  });

  const goNext = () => {
    if (sectionIndex < sections.length - 1) {
      setSectionIndex(sectionIndex + 1);
      bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setActiveTab("addons");
      setToast("Menu courses done — optional add-ons next, or proceed to book.");
    }
  };

  const goPrev = () => {
    if (sectionIndex > 0) {
      setSectionIndex(sectionIndex - 1);
      bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const jumpToSection = (i: number) => {
    setActiveTab("menu");
    setSectionIndex(i);
    bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const proceedToQuotation = () => {
    if (!user) {
      setAuthModal("login");
      return;
    }
    setQuotationPanel(true);
    closeMenuBuilder();
  };

  const quickShare = () => {
    const menuText = Object.entries(selected).map(([s, dishes]) => `• ${s}: ${dishes.join(", ")}`).join("\n");
    const addonsText = selectedAddons.map((id) => addons.find((a) => a.id === id)?.name).filter(Boolean).join(", ");
    const customText = customDishes.length > 0 ? `\nCustom: ${customDishes.join("; ")}` : "";
    const msg = `🍽️ *Rasa Quotation Request*\n\n*Package:* ${pkg.name} (₹${pkg.price}/guest)\n*Guests:* ${activeQuotation.guests}\n\n*Menu:*\n${menuText || "—"}${customText}${addonsText ? `\n\n*Add-ons:* ${addonsText}` : ""}\n\n*Estimated Total:* ₹${total.toLocaleString("en-IN")} (incl. GST)\n*Advance (${CONFIG.advancePercent}%):* ₹${advance.toLocaleString("en-IN")}\n\n_Customer: ${user?.name || "Guest"} · ${user?.phone || ""}_`;
    window.open(`https://wa.me/${CONFIG.bossWhatsApp}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const helpLine = (() => {
    if (activeTab === "addons") return "Add-ons are optional extras. Pick what you like, or skip and proceed.";
    if (activeTab === "custom") return "Need something not listed? Add a custom dish request — chef will confirm pricing.";
    if (!current) return "";
    const max = parseSelection(current.selection);
    const cur = (selected[current.section] || []).length;
    if (max === 999) return "These items are included for everyone — nothing to pick. Tap Next.";
    if (max === 0) return "Complimentary course — already included. Tap Next to continue.";
    if (cur === 0) return `Pick ${max === 1 ? "1 dish" : `up to ${max} dishes`} for ${current.section}. Tap a name to select.`;
    if (cur < Math.min(max, current.dishes.length)) return `Good start — select ${Math.min(max, current.dishes.length) - cur} more for this course.`;
    return "This course is complete. Tap Next Course when you're ready.";
  })();

  // Group addons by category for easier browsing
  const activeAddonCat = addonCategories.includes(addonCat) ? addonCat : addonCategories[0] || "";
  const visibleAddons = addons.filter((a) => a.category === activeAddonCat);

  return (
    <div className="fixed inset-0 z-[120] flex justify-end" style={{ background: "rgba(14,7,13,.72)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}>
      <div className="relative w-full max-w-[700px] h-full flex flex-col" style={{ background: "linear-gradient(180deg,#F6EFE0 0%,#EEE3CF 100%)", color: "#2c1a26" }}>
        {/* Header */}
        <div className="flex-shrink-0 relative z-10 p-7 pb-5" style={{ background: "linear-gradient(180deg,#2f1e2f 0%,#221421 60%,#180d17 100%)" }}>
          <button onClick={closeMenuBuilder} className="absolute top-5 right-5 w-[38px] h-[38px] rounded-full border flex items-center justify-center transition-colors hover:bg-yellow-600 hover:text-black" style={{ border: "1px solid var(--paper-line)", color: "var(--ivory)" }}>
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-1">
            <img src={CONFIG.logo} alt="Rasa" className="h-8 w-auto" />
            <div className="text-[0.72rem] font-semibold tracking-[0.32em] uppercase" style={{ color: "var(--gold-bright)" }}>Build your menu</div>
          </div>
          <h3 className="font-display text-[2rem] mb-0.5" style={{ color: "var(--ivory)" }}>{pkg.name}</h3>
          <div className="font-display italic text-[1rem]" style={{ color: "var(--gold-bright)" }}>{pkg.tagline}</div>
          <div className="font-display text-[1.4rem] mt-3" style={{ color: "var(--ivory)" }}>
            ₹{pkg.price}<span className="text-[0.72rem] tracking-[0.14em] font-normal ml-2" style={{ color: "rgba(246,239,224,.62)" }}>PER GUEST</span>
          </div>

          <div className="mt-4 p-3 rounded-md" style={{ background: completionPct === 100 ? "rgba(31,122,92,.15)" : "rgba(198,152,58,.1)", border: `1px solid ${completionPct === 100 ? "rgba(31,122,92,.3)" : "var(--paper-line)"}` }}>
            <div className="flex items-center gap-2 mb-2">
              {completionPct === 100 ? <Check className="w-4 h-4" style={{ color: "#1f7a5c" }} /> : <Info className="w-4 h-4" style={{ color: "var(--gold-bright)" }} />}
              <span className="text-[0.78rem] font-medium" style={{ color: completionPct === 100 ? "#1f7a5c" : "var(--ivory)" }}>
                {completionPct}% complete — {completedSections.length}/{requiredSections.length} courses chosen
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden mb-2" style={{ background: "rgba(246,239,224,.1)" }}>
              <div className="h-full transition-all duration-500" style={{ width: `${completionPct}%`, background: completionPct === 100 ? "#1f7a5c" : "linear-gradient(90deg,#C6983A,#E2B658)" }} />
            </div>
            <div className="text-[0.76rem] italic" style={{ color: "rgba(246,239,224,.7)" }}>{helpLine}</div>
          </div>

          {/* Section stepper dots */}
          {activeTab === "menu" && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {sections.map((s, i) => {
                const done = isSectionComplete(s.selection, (selected[s.section] || []).length, s.dishes.length);
                const isCurrent = i === sectionIndex;
                return (
                  <button
                    key={s.section}
                    title={s.section}
                    onClick={() => jumpToSection(i)}
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: isCurrent ? 22 : 10,
                      background: isCurrent ? "var(--gold-bright)" : done ? "#1f7a5c" : "rgba(246,239,224,.25)",
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex px-7 pt-4 gap-2 flex-shrink-0" style={{ background: "var(--ivory)" }}>
          <button onClick={() => setActiveTab("menu")} className="px-4 py-2 rounded-full text-[0.86rem] font-medium" style={activeTab === "menu" ? { background: "var(--gold)", color: "#231318", fontWeight: 600 } : { border: "1px solid rgba(58,39,51,.2)", color: "var(--on-ivory-dim)" }}>
            Menu ({sectionIndex + 1}/{sections.length})
          </button>
          <button onClick={() => setActiveTab("addons")} className="px-4 py-2 rounded-full text-[0.86rem] font-medium" style={activeTab === "addons" ? { background: "var(--gold)", color: "#231318", fontWeight: 600 } : { border: "1px solid rgba(58,39,51,.2)", color: "var(--on-ivory-dim)" }}>
            Add-ons ({selectedAddons.length})
          </button>
          <button onClick={() => setActiveTab("custom")} className="px-4 py-2 rounded-full text-[0.86rem] font-medium flex items-center gap-1" style={activeTab === "custom" ? { background: "var(--gold)", color: "#231318", fontWeight: 600 } : { border: "1px solid rgba(58,39,51,.2)", color: "var(--on-ivory-dim)" }}>
            <Sparkles className="w-3 h-3" /> Custom ({customDishes.length})
          </button>
        </div>

        {/* Body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-7 pb-4" style={{ background: "var(--ivory)" }}>
          {activeTab === "menu" && current && (
            <div className="pt-2">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <div>
                  <div className="text-[0.68rem] tracking-[0.18em] uppercase font-bold mb-1" style={{ color: "var(--on-ivory-dim)" }}>
                    Course {sectionIndex + 1} of {sections.length}
                  </div>
                  <h4 className="font-display text-[1.6rem]" style={{ color: "#2c1a26" }}>{current.section}</h4>
                </div>
                <span className="text-[0.68rem] tracking-[0.14em] uppercase font-bold px-[11px] py-1 rounded-full whitespace-nowrap" style={{ color: "var(--anaar)", background: "rgba(156,42,56,.09)" }}>
                  {current.selection} ({(selected[current.section] || []).length}/{Math.min(parseSelection(current.selection) || current.dishes.length, current.dishes.length)})
                </span>
              </div>

              {parseSelection(current.selection) === 999 || parseSelection(current.selection) === 0 ? (
                <div className="mt-4 p-4 rounded-md" style={{ background: "rgba(31,122,92,.08)", border: "1px solid rgba(31,122,92,.2)" }}>
                  <p className="text-[0.9rem] mb-3" style={{ color: "#2c1a26" }}>
                    {parseSelection(current.selection) === 0 ? "Complimentary — included with your package." : "All of these are served with your package."}
                  </p>
                  <ul className="space-y-1.5">
                    {current.dishes.map((dish) => (
                      <li key={dish} className="text-[0.9rem] flex items-center gap-2" style={{ color: "var(--on-ivory-dim)" }}>
                        <Check className="w-3.5 h-3.5" style={{ color: "#1f7a5c" }} /> {dish}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0 mt-4">
                  {current.dishes.map((dish) => {
                    const cur = selected[current.section] || [];
                    const isSel = cur.includes(dish);
                    const max = parseSelection(current.selection);
                    return (
                      <button
                        key={dish}
                        onClick={() => toggleDish(current.section, dish, max)}
                        className={`flex gap-3 items-center px-1.5 py-2 rounded-md text-left transition-colors ${isSel ? "" : "hover:bg-yellow-50"}`}
                        style={isSel ? { color: "#2c1a26", fontWeight: 500 } : { color: "var(--on-ivory-dim)" }}
                      >
                        <span className="w-[19px] h-[19px] rounded-md border flex items-center justify-center transition-all flex-shrink-0" style={isSel ? { background: "var(--gold)", borderColor: "var(--gold)" } : { border: "1.5px solid rgba(58,39,51,.3)", background: "#fff" }}>
                          {isSel && <Check className="w-3 h-3 text-white" strokeWidth={3.4} />}
                        </span>
                        <span className="text-[0.92rem]">{dish}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Course navigation */}
              <div className="flex gap-2 mt-8 mb-2">
                <button
                  onClick={goPrev}
                  disabled={sectionIndex === 0}
                  className="flex-1 py-3 rounded-md font-semibold text-[0.9rem] flex items-center justify-center gap-2 disabled:opacity-40"
                  style={{ border: "1px solid rgba(58,39,51,.25)", color: "#2c1a26" }}
                >
                  <ArrowLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  onClick={goNext}
                  className="flex-[1.4] py-3 rounded-md font-semibold text-[0.9rem] flex items-center justify-center gap-2"
                  style={{
                    background: currentComplete ? "var(--gold)" : "rgba(198,152,58,.35)",
                    color: "#231318",
                  }}
                >
                  {sectionIndex < sections.length - 1
                    ? (currentComplete ? "Next Course" : "Skip for now")
                    : "Continue to Add-ons"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              {!currentComplete && nextIncompleteIndex < 0 && sectionIndex < sections.length - 1 && (
                <p className="text-[0.78rem] text-center mb-2" style={{ color: "var(--on-ivory-dim)" }}>
                  You can skip and come back — progress dots stay open until each course is filled.
                </p>
              )}
            </div>
          )}

          {activeTab === "addons" && (
            <div className="py-5">
              <div className="mb-4 p-3 rounded-md" style={{ background: "rgba(198,152,58,.08)", border: "1px solid var(--paper-line)" }}>
                <p className="text-[0.82rem]" style={{ color: "var(--on-ivory-dim)" }}>
                  <b style={{ color: "#2c1a26" }}>Add-ons are optional.</b> Live stations, regional thalis, mithai, frozen theatre, and mansahari — pick any on top of your package.
                  {" "}Per-guest extras with a guest minimum are billed on <b style={{ color: "#2c1a26" }}>max({activeQuotation.guests} guests, that minimum)</b> in your quotation.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {addonCategories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAddonCat(c)}
                    className="px-3 py-1.5 rounded-full text-[0.72rem] font-medium"
                    style={activeAddonCat === c
                      ? { background: "var(--gold)", color: "#231318", fontWeight: 600 }
                      : { border: "1px solid rgba(58,39,51,.2)", color: "var(--on-ivory-dim)" }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {visibleAddons.map((a) => {
                const isSel = selectedAddons.includes(a.id);
                const priceStr = a.priceType === "per_guest" ? `₹${a.price}/guest` : a.priceType === "per_event" ? `₹${a.price}/event` : `₹${a.price}`;
                const badge = addonMinGuestsBadge(a);
                const note = isSel ? addonPricingNote(a, activeQuotation.guests) : addonPricingNote(a);
                return (
                  <div key={a.id} className="py-4 border-b" style={{ borderColor: "rgba(58,39,51,.14)" }}>
                    <button onClick={() => toggleAddon(a.id)} className="flex gap-3 items-start w-full text-left">
                      <span className="w-[22px] h-[22px] rounded-md border flex-shrink-0 flex items-center justify-center mt-1 transition-all" style={isSel ? { background: "var(--gold)", borderColor: "var(--gold)" } : { border: "1.5px solid rgba(58,39,51,.3)", background: "#fff" }}>
                        {isSel && <Check className="w-3 h-3 text-white" strokeWidth={3.4} />}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between gap-3 items-baseline">
                          <div className="font-display text-[1.15rem]" style={{ color: "#2c1a26" }}>
                            {a.name}
                            {a.nv && <span className="ml-2 inline-block w-3 h-3 align-middle" style={{ border: "1.5px solid #c0392b", borderRadius: 2 }} />}
                          </div>
                          <div className="text-[0.86rem] font-semibold whitespace-nowrap text-right" style={{ color: "var(--anaar)" }}>
                            {priceStr}
                            {badge && <div className="text-[0.65rem] font-medium opacity-80">{badge}</div>}
                          </div>
                        </div>
                        <div className="text-[0.88rem] font-light mt-1" style={{ color: "var(--on-ivory-dim)" }}>{a.description}</div>
                        {note && <div className="text-[0.72rem] mt-1.5" style={{ color: "var(--gold)" }}>{note}</div>}
                      </div>
                    </button>
                    {isSel && a.choices && a.choices.length > 0 && (
                      <div className="ml-9 mt-2 flex flex-wrap gap-1.5">
                        {a.choices.map((ch) => {
                          const picked = activeQuotation.addonChoices[a.id] === ch;
                          return (
                            <button
                              key={ch}
                              onClick={() => toggleAddonChoice(a.id, ch)}
                              className="text-[0.72rem] px-2.5 py-1 rounded-full"
                              style={picked
                                ? { background: "var(--gold)", color: "#231318", fontWeight: 600 }
                                : { background: "rgba(198,152,58,.08)", border: "1px solid rgba(58,39,51,.2)", color: "var(--on-ivory-dim)" }}
                            >
                              {ch}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "custom" && (
            <div className="py-5">
              <div className="mb-4 p-4 rounded-md" style={{ background: "rgba(198,152,58,.08)", border: "1px solid var(--paper-line)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4" style={{ color: "var(--gold)" }} />
                  <span className="font-display text-[1.1rem]" style={{ color: "#2c1a26" }}>Add your own dishes</span>
                </div>
                <p className="text-[0.82rem]" style={{ color: "var(--on-ivory-dim)" }}>
                  Don't see a dish you want? Add it here. Our chef will review and confirm. Pricing will be quoted separately — these are <b>requests</b>, not yet confirmed.
                </p>
              </div>

              <div className="space-y-3 mb-5">
                <select value={customSection} onChange={(e) => setCustomSection(e.target.value)} className="w-full rounded-md px-3 py-2.5 text-[0.9rem]" style={{ border: "1px solid rgba(58,39,51,.3)", background: "#fff" }}>
                  {sections.map((s) => (
                    <option key={s.section}>{s.section}</option>
                  ))}
                  <option>Other</option>
                </select>
                <div className="flex gap-2">
                  <input value={customDishInput} onChange={(e) => setCustomDishInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustomDish()} placeholder="e.g. Hyderabadi Dum Biryani…" className="flex-1 rounded-md px-3 py-2.5 text-[0.9rem]" style={{ border: "1px solid rgba(58,39,51,.3)", background: "#fff" }} />
                  <button onClick={addCustomDish} className="glossy-btn-gold px-4 py-2 rounded-md font-semibold text-[0.86rem] flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>

              {customDishes.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-[0.72rem] tracking-[0.14em] uppercase font-bold" style={{ color: "var(--on-ivory-dim)" }}>Your custom dishes</div>
                  {customDishes.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-md" style={{ background: "rgba(198,152,58,.06)", border: "1px solid var(--paper-line)" }}>
                      <span className="text-[0.9rem]" style={{ color: "#2c1a26" }}>{d}</span>
                      <button onClick={() => removeCustomDish(i)} className="text-[0.78rem] font-semibold" style={{ color: "var(--anaar)" }}>Remove</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[0.86rem]" style={{ color: "var(--on-ivory-dim)" }}>
                  No custom dishes added yet.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-7 pt-3" style={{ background: "linear-gradient(180deg,#EEE3CF 0%,#E4D6BC 100%)" }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[0.78rem] tracking-[0.14em] uppercase font-bold" style={{ color: "var(--on-ivory-dim)" }}>Guests</span>
            <button onClick={() => setActiveQuotation({ guests: Math.max(CONFIG.minGuests, activeQuotation.guests - 10) })} className="w-8 h-8 rounded-md border flex items-center justify-center" style={{ borderColor: "rgba(58,39,51,.3)" }}>
              <Minus className="w-4 h-4" />
            </button>
            <input type="number" min={CONFIG.minGuests} value={activeQuotation.guests} onChange={(e) => setActiveQuotation({ guests: Math.max(CONFIG.minGuests, parseInt(e.target.value) || CONFIG.minGuests) })} className="w-24 px-3 py-1.5 rounded-md text-center font-semibold" style={{ border: "1px solid rgba(58,39,51,.3)", background: "#fff" }} />
            <button onClick={() => setActiveQuotation({ guests: activeQuotation.guests + 10 })} className="w-8 h-8 rounded-md border flex items-center justify-center" style={{ borderColor: "rgba(58,39,51,.3)" }}>
              <Plus className="w-4 h-4" />
            </button>
            <div className="ml-auto text-right">
              <div className="text-[0.7rem] tracking-[0.14em] uppercase" style={{ color: "var(--on-ivory-dim)" }}>Estimate (incl. GST)</div>
              <div className="font-display text-[1.6rem]" style={{ color: "var(--anaar)" }}>₹{total.toLocaleString("en-IN")}</div>
            </div>
          </div>
          <div className="text-[0.74rem] mb-3" style={{ color: "var(--on-ivory-dim)" }}>
            Package: ₹{pkgTotal.toLocaleString("en-IN")} · Add-ons: ₹{addonsTotal.toLocaleString("en-IN")} · GST 5%: ₹{gst.toLocaleString("en-IN")} · Advance ({CONFIG.advancePercent}%): ₹{advance.toLocaleString("en-IN")}
          </div>
          <button onClick={quickShare} className="glossy-btn-wa w-full py-2.5 rounded-md font-semibold text-[0.86rem] mb-2 flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" /> Send to WhatsApp & get a quote
          </button>
          <button onClick={proceedToQuotation} className="glossy-btn-gold w-full py-3.5 rounded-md font-semibold tracking-[0.03em] text-[0.95rem] flex items-center justify-center gap-2">
            {user ? "Proceed to Book" : "Login to Continue"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
