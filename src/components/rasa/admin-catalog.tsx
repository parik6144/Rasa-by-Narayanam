"use client";
import { useState, useEffect, useCallback, type ReactNode, type CSSProperties } from "react";
import { useApp } from "@/store/app-store";
import { addonPricingNote } from "@/lib/addon-pricing";
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, Save, Eye, EyeOff, Star } from "lucide-react";

interface SectionDish {
  linkId: string;
  id: string;
  name: string;
  displayOrder: number;
}
interface Section {
  id: string;
  name: string;
  selectionRule: string;
  selectionCount: number;
  displayOrder: number;
  isAll: boolean;
  isComplimentary: boolean;
  dishes: SectionDish[];
}
interface AdminPackage {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  price: number;
  minGuests: number;
  featured: boolean;
  isActive: boolean;
  displayOrder: number;
  bookingCount: number;
  sections: Section[];
}
interface AdminAddon {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  priceType: string;
  category: string;
  isNv: boolean;
  isActive: boolean;
  displayOrder: number;
  guestRange: number;
  choices: string[];
}

const SELECTION_PRESETS = [
  "Any One",
  "Any Two",
  "Any Three",
  "Any Four",
  "Any 5",
  "Any 6",
  "Any 8",
  "All",
  "Complimentary",
];

const PRICE_TYPES = ["per_guest", "per_event", "flat", "per_variety"];

export default function AdminCatalog() {
  const { setToast } = useApp();
  const [sub, setSub] = useState<"packages" | "addons">("packages");
  const [packages, setPackages] = useState<AdminPackage[]>([]);
  const [addons, setAddons] = useState<AdminAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);
  const [editingPkg, setEditingPkg] = useState<AdminPackage | null>(null);
  const [editingSection, setEditingSection] = useState<{ pkgId: string; section: Section | null } | null>(null);
  const [editingAddon, setEditingAddon] = useState<AdminAddon | null | "new">(null);
  const [creatingPkg, setCreatingPkg] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([
        fetch("/api/admin/packages").then((r) => r.json()),
        fetch("/api/admin/addons").then((r) => r.json()),
      ]);
      if (p.error) throw new Error(p.error);
      if (a.error) throw new Error(a.error);
      setPackages(p.packages || []);
      setAddons(a.addons || []);
    } catch (e: unknown) {
      setToast(e instanceof Error ? e.message : "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }, [setToast]);

  useEffect(() => {
    load();
  }, [load]);

  const savePackage = async (form: Partial<AdminPackage> & { id?: string }) => {
    const isNew = !form.id;
    const res = await fetch("/api/admin/packages", {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    setToast(isNew ? "Package created" : "Package updated");
    setEditingPkg(null);
    setCreatingPkg(false);
    await load();
  };

  const deletePackage = async (id: string, name: string) => {
    if (!confirm(`Delete / deactivate package "${name}"?`)) return;
    const res = await fetch(`/api/admin/packages?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Delete failed");
    setToast(data.message || "Package removed");
    await load();
  };

  const saveSection = async (pkgId: string, section: Partial<Section> & { dishesText?: string }) => {
    const dishes = (section.dishesText || "")
      .split("\n")
      .map((d) => d.trim())
      .filter(Boolean);
    const payload = {
      id: section.id,
      packageId: pkgId,
      name: section.name,
      selectionRule: section.selectionRule,
      dishes,
    };
    const res = await fetch("/api/admin/sections", {
      method: section.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Section save failed");
    setToast(section.id ? "Section updated" : "Section added");
    setEditingSection(null);
    await load();
  };

  const deleteSection = async (id: string, name: string) => {
    if (!confirm(`Delete section "${name}" and its dish links?`)) return;
    const res = await fetch(`/api/admin/sections?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Delete failed");
    setToast("Section deleted");
    await load();
  };

  const saveAddon = async (form: Partial<AdminAddon> & { id?: string; choicesText?: string }) => {
    const choices = (form.choicesText ?? form.choices?.join("\n") ?? "")
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);
    const payload = { ...form, choices };
    const isNew = !form.id;
    const res = await fetch("/api/admin/addons", {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    setToast(isNew ? "Add-on created" : "Add-on updated");
    setEditingAddon(null);
    await load();
  };

  const deleteAddon = async (id: string, name: string) => {
    if (!confirm(`Permanently delete add-on "${name}"?`)) return;
    const res = await fetch(`/api/admin/addons?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Delete failed");
    setToast("Add-on deleted");
    await load();
  };

  const categories = Array.from(new Set(addons.map((a) => a.category)));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-[0.72rem] tracking-[0.32em] uppercase mb-1" style={{ color: "var(--gold)" }}>Catalog CMS</div>
          <h1 className="font-display text-[2rem]" style={{ color: "var(--ivory)" }}>Packages & Add-ons</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(246,239,224,.62)" }}>
            Homepage packages, menu sections, dishes, and add-ons — edit live from here.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSub("packages")}
            className="px-4 py-2 rounded-full text-sm font-medium"
            style={sub === "packages" ? { background: "var(--gold)", color: "#231318", fontWeight: 600 } : { border: "1px solid var(--paper-line)", color: "rgba(246,239,224,.72)" }}
          >
            Packages ({packages.length})
          </button>
          <button
            onClick={() => setSub("addons")}
            className="px-4 py-2 rounded-full text-sm font-medium"
            style={sub === "addons" ? { background: "var(--gold)", color: "#231318", fontWeight: 600 } : { border: "1px solid var(--paper-line)", color: "rgba(246,239,224,.72)" }}
          >
            Add-ons ({addons.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: "rgba(246,239,224,.62)" }}>Loading catalog…</div>
      ) : sub === "packages" ? (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => { setCreatingPkg(true); setEditingPkg({ id: "", slug: "", name: "", tagline: "", price: 699, minGuests: 100, featured: false, isActive: true, displayOrder: 0, bookingCount: 0, sections: [] }); }}
              className="glossy-btn-gold px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Package
            </button>
          </div>

          <div className="space-y-3">
            {packages.map((p) => {
              const open = expandedPkg === p.id;
              const dishCount = p.sections.reduce((n, s) => n + s.dishes.length, 0);
              return (
                <div key={p.id} className="glass-panel rounded-lg overflow-hidden">
                  <div className="p-4 flex flex-wrap items-center gap-3 justify-between">
                    <button onClick={() => setExpandedPkg(open ? null : p.id)} className="flex items-center gap-3 text-left flex-1 min-w-[200px]">
                      {open ? <ChevronDown className="w-4 h-4" style={{ color: "var(--gold)" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "var(--gold)" }} />}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display text-[1.15rem]" style={{ color: "var(--ivory)" }}>{p.name}</span>
                          {p.featured && <Star className="w-3.5 h-3.5" style={{ color: "var(--gold-bright)" }} />}
                          {!p.isActive && <span className="text-[0.66rem] uppercase px-2 py-0.5 rounded-full" style={{ background: "rgba(156,42,56,.2)", color: "var(--anaar-bright)" }}>Inactive</span>}
                        </div>
                        <div className="text-xs" style={{ color: "rgba(246,239,224,.62)" }}>
                          ₹{p.price}/guest · {p.sections.length} sections · {dishCount} dishes · {p.bookingCount} bookings · {p.slug}
                        </div>
                      </div>
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingPkg(p)} className="px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1" style={{ border: "1px solid var(--paper-line)", color: "var(--gold-bright)" }}>
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button onClick={() => deletePackage(p.id, p.name)} className="px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1" style={{ border: "1px solid rgba(156,42,56,.4)", color: "var(--anaar-bright)" }}>
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>

                  {open && (
                    <div className="px-4 pb-4 border-t" style={{ borderColor: "var(--paper-line)" }}>
                      <div className="flex justify-between items-center py-3">
                        <div className="text-[0.72rem] tracking-[0.14em] uppercase font-bold" style={{ color: "rgba(246,239,224,.62)" }}>Menu sections</div>
                        <button
                          onClick={() => setEditingSection({
                            pkgId: p.id,
                            section: { id: "", name: "", selectionRule: "Any One", selectionCount: 1, displayOrder: 0, isAll: false, isComplimentary: false, dishes: [] },
                          })}
                          className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--gold-bright)" }}
                        >
                          <Plus className="w-3 h-3" /> Add section
                        </button>
                      </div>
                      <div className="space-y-2">
                        {p.sections.map((s) => (
                          <div key={s.id} className="rounded-md p-3" style={{ background: "rgba(198,152,58,.06)", border: "1px solid var(--paper-line)" }}>
                            <div className="flex flex-wrap justify-between gap-2 mb-2">
                              <div>
                                <span className="font-medium text-sm" style={{ color: "var(--ivory)" }}>{s.name}</span>
                                <span className="ml-2 text-[0.7rem] px-2 py-0.5 rounded-full" style={{ background: "rgba(156,42,56,.15)", color: "var(--anaar-bright)" }}>{s.selectionRule}</span>
                                <span className="ml-2 text-[0.7rem]" style={{ color: "rgba(246,239,224,.5)" }}>{s.dishes.length} dishes</span>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => setEditingSection({ pkgId: p.id, section: s })} className="text-[0.72rem] font-semibold" style={{ color: "var(--gold-bright)" }}>Edit</button>
                                <button onClick={() => deleteSection(s.id, s.name)} className="text-[0.72rem] font-semibold" style={{ color: "var(--anaar-bright)" }}>Delete</button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {s.dishes.slice(0, 12).map((d) => (
                                <span key={d.linkId} className="text-[0.7rem] px-2 py-0.5 rounded-full" style={{ background: "rgba(246,239,224,.06)", color: "rgba(246,239,224,.72)", border: "1px solid var(--paper-line)" }}>
                                  {d.name}
                                </span>
                              ))}
                              {s.dishes.length > 12 && (
                                <span className="text-[0.7rem]" style={{ color: "rgba(246,239,224,.5)" }}>+{s.dishes.length - 12} more</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {p.sections.length === 0 && (
                          <div className="text-sm py-4 text-center" style={{ color: "rgba(246,239,224,.5)" }}>No sections yet — add courses for this package.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4 p-3 rounded-lg text-sm flex items-start gap-2" style={{ background: "rgba(198,152,58,.1)", border: "1px solid rgba(198,152,58,.28)" }}>
            <span style={{ color: "var(--gold-bright)" }}>ⓘ</span>
            <span style={{ color: "rgba(246,239,224,.78)" }}>
              <b style={{ color: "var(--ivory)" }}>Policy:</b> package = actual guests;
              {" "}per guest / per variety = min 500 (then actual if higher);
              {" "}per event = listed price up to 500, pro-rata above (hostess always fixed).
              Edit any card to change the range (e.g. 500).
            </span>
          </div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setEditingAddon("new")} className="glossy-btn-gold px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Add-on
            </button>
          </div>

          {categories.map((cat) => (
            <div key={cat} className="mb-6">
              <h3 className="font-display text-[1.2rem] mb-3" style={{ color: "var(--gold-bright)" }}>{cat}</h3>
              <div className="space-y-2">
                {addons.filter((a) => a.category === cat).map((a) => (
                  <div key={a.id} className="glass-panel rounded-lg p-4 flex flex-wrap justify-between gap-3 items-start">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium" style={{ color: "var(--ivory)" }}>{a.name}</span>
                        {a.isNv && <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded" style={{ background: "#c0392b", color: "#fff" }}>NV</span>}
                        {!a.isActive && <span className="text-[0.66rem] uppercase px-2 py-0.5 rounded-full" style={{ background: "rgba(156,42,56,.2)", color: "var(--anaar-bright)" }}>Off</span>}
                        {a.guestRange > 0 && (a.priceType === "per_guest" || a.priceType === "per_variety") && (
                          <span className="text-[0.62rem] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full" style={{ background: "rgba(198,152,58,.2)", color: "var(--gold-bright)", border: "1px solid rgba(198,152,58,.45)" }}>
                            Min {a.guestRange} guests
                          </span>
                        )}
                        {a.priceType === "per_event" && (
                          <span className="text-[0.62rem] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full" style={{ background: "rgba(246,239,224,.08)", color: "rgba(246,239,224,.7)", border: "1px solid rgba(246,239,224,.2)" }}>
                            Flat / event
                          </span>
                        )}
                      </div>
                      <div className="text-xs mt-1" style={{ color: "rgba(246,239,224,.62)" }}>
                        ₹{a.price} · {a.priceType}
                        {a.description ? ` · ${a.description.slice(0, 80)}${a.description.length > 80 ? "…" : ""}` : ""}
                      </div>
                      {addonPricingNote(a) && (
                        <div className="mt-1.5 text-[0.72rem]" style={{ color: "rgba(226,182,88,.85)" }}>
                          {addonPricingNote(a)}
                        </div>
                      )}
                      {a.choices.length > 0 && (
                        <div className="mt-1 text-[0.7rem]" style={{ color: "rgba(246,239,224,.5)" }}>Choices: {a.choices.slice(0, 5).join(", ")}{a.choices.length > 5 ? "…" : ""}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingAddon(a)} className="px-3 py-1.5 rounded text-xs font-semibold" style={{ border: "1px solid var(--paper-line)", color: "var(--gold-bright)" }}>
                        <Pencil className="w-3 h-3 inline" /> Edit
                      </button>
                      <button onClick={() => deleteAddon(a.id, a.name)} className="px-3 py-1.5 rounded text-xs font-semibold" style={{ border: "1px solid rgba(156,42,56,.4)", color: "var(--anaar-bright)" }}>
                        <Trash2 className="w-3 h-3 inline" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Package edit modal */}
      {(editingPkg || creatingPkg) && editingPkg && (
        <PackageForm
          pkg={editingPkg}
          isNew={!editingPkg.id}
          onClose={() => { setEditingPkg(null); setCreatingPkg(false); }}
          onSave={async (form) => {
            try { await savePackage(form); } catch (e: unknown) { setToast(e instanceof Error ? e.message : "Error"); }
          }}
        />
      )}

      {/* Section edit modal */}
      {editingSection && (
        <SectionForm
          section={editingSection.section}
          onClose={() => setEditingSection(null)}
          onSave={async (form) => {
            try { await saveSection(editingSection.pkgId, form); } catch (e: unknown) { setToast(e instanceof Error ? e.message : "Error"); }
          }}
        />
      )}

      {/* Addon edit modal */}
      {editingAddon && (
        <AddonForm
          addon={editingAddon === "new" ? null : editingAddon}
          categories={categories}
          onClose={() => setEditingAddon(null)}
          onSave={async (form) => {
            try { await saveAddon(form); } catch (e: unknown) { setToast(e instanceof Error ? e.message : "Error"); }
          }}
        />
      )}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(14,7,13,.75)" }}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg p-6 relative" style={{ background: "linear-gradient(180deg,#2a1a29,#1a0f19)", border: "1px solid var(--paper-line)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center" style={{ border: "1px solid var(--paper-line)", color: "var(--ivory)" }}>
          <X className="w-4 h-4" />
        </button>
        <h3 className="font-display text-[1.4rem] mb-4 pr-8" style={{ color: "var(--ivory)" }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

function fieldStyle(): CSSProperties {
  return { background: "rgba(28,16,27,.8)", border: "1px solid var(--paper-line)", color: "var(--ivory)" };
}

function PackageForm({ pkg, isNew, onClose, onSave }: { pkg: AdminPackage; isNew: boolean; onClose: () => void; onSave: (f: Partial<AdminPackage>) => Promise<void> }) {
  const [form, setForm] = useState({ ...pkg });
  const [saving, setSaving] = useState(false);
  return (
    <ModalShell title={isNew ? "New Package" : `Edit ${pkg.name}`} onClose={onClose}>
      <div className="space-y-3">
        {[
          { key: "name", label: "Name" },
          { key: "tagline", label: "Tagline" },
          { key: "slug", label: "Slug (URL id)" },
        ].map((f) => (
          <label key={f.key} className="block text-xs" style={{ color: "rgba(246,239,224,.62)" }}>
            {f.label}
            <input
              className="mt-1 w-full px-3 py-2 rounded-md text-sm"
              style={fieldStyle()}
              value={(form as Record<string, unknown>)[f.key] as string}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          </label>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs" style={{ color: "rgba(246,239,224,.62)" }}>
            Price / guest (₹)
            <input type="number" className="mt-1 w-full px-3 py-2 rounded-md text-sm" style={fieldStyle()} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          </label>
          <label className="block text-xs" style={{ color: "rgba(246,239,224,.62)" }}>
            Min guests
            <input type="number" className="mt-1 w-full px-3 py-2 rounded-md text-sm" style={fieldStyle()} value={form.minGuests} onChange={(e) => setForm({ ...form, minGuests: Number(e.target.value) })} />
          </label>
        </div>
        <div className="flex gap-4 text-sm" style={{ color: "var(--ivory)" }}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured (Most Loved)
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            {form.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} Active on site
          </label>
        </div>
        <button
          disabled={saving}
          onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }}
          className="glossy-btn-gold w-full py-2.5 rounded-md font-semibold text-sm flex items-center justify-center gap-2 mt-2"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Package"}
        </button>
      </div>
    </ModalShell>
  );
}

function SectionForm({ section, onClose, onSave }: { section: Section | null; onClose: () => void; onSave: (f: Partial<Section> & { dishesText?: string }) => Promise<void> }) {
  const [name, setName] = useState(section?.name || "");
  const [rule, setRule] = useState(section?.selectionRule || "Any One");
  const [dishesText, setDishesText] = useState(section?.dishes.map((d) => d.name).join("\n") || "");
  const [saving, setSaving] = useState(false);
  return (
    <ModalShell title={section?.id ? `Edit section: ${section.name}` : "New section"} onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-xs" style={{ color: "rgba(246,239,224,.62)" }}>
          Section name
          <input className="mt-1 w-full px-3 py-2 rounded-md text-sm" style={fieldStyle()} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome Drink" />
        </label>
        <label className="block text-xs" style={{ color: "rgba(246,239,224,.62)" }}>
          Selection rule
          <select className="mt-1 w-full px-3 py-2 rounded-md text-sm" style={fieldStyle()} value={rule} onChange={(e) => setRule(e.target.value)}>
            {SELECTION_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="block text-xs" style={{ color: "rgba(246,239,224,.62)" }}>
          Dishes (one per line)
          <textarea className="mt-1 w-full px-3 py-2 rounded-md text-sm min-h-[200px] font-mono" style={fieldStyle()} value={dishesText} onChange={(e) => setDishesText(e.target.value)} placeholder={"Virgin Mojito\nMango Tango\nBlue Lagoon"} />
        </label>
        <div className="text-[0.72rem]" style={{ color: "rgba(246,239,224,.5)" }}>
          {dishesText.split("\n").filter((l) => l.trim()).length} dishes listed
        </div>
        <button
          disabled={saving || !name.trim()}
          onClick={async () => {
            setSaving(true);
            await onSave({ id: section?.id || "", name, selectionRule: rule, dishesText });
            setSaving(false);
          }}
          className="glossy-btn-gold w-full py-2.5 rounded-md font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Section"}
        </button>
      </div>
    </ModalShell>
  );
}

function AddonForm({ addon, categories, onClose, onSave }: { addon: AdminAddon | null; categories: string[]; onClose: () => void; onSave: (f: Partial<AdminAddon> & { choicesText?: string }) => Promise<void> }) {
  const [form, setForm] = useState({
    id: addon?.id || "",
    name: addon?.name || "",
    description: addon?.description || "",
    price: addon?.price ?? 0,
    priceType: addon?.priceType || "per_guest",
    category: addon?.category || categories[0] || "Beverages & Welcome",
    isNv: addon?.isNv || false,
    isActive: addon?.isActive !== false,
    guestRange: addon?.guestRange ?? 500,
    choicesText: addon?.choices.join("\n") || "",
  });
  const [saving, setSaving] = useState(false);
  return (
    <ModalShell title={addon ? `Edit: ${addon.name}` : "New Add-on"} onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-xs" style={{ color: "rgba(246,239,224,.62)" }}>
          Name
          <input className="mt-1 w-full px-3 py-2 rounded-md text-sm" style={fieldStyle()} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="block text-xs" style={{ color: "rgba(246,239,224,.62)" }}>
          Description
          <textarea className="mt-1 w-full px-3 py-2 rounded-md text-sm" style={fieldStyle()} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs" style={{ color: "rgba(246,239,224,.62)" }}>
            Price (₹)
            <input type="number" className="mt-1 w-full px-3 py-2 rounded-md text-sm" style={fieldStyle()} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          </label>
          <label className="block text-xs" style={{ color: "rgba(246,239,224,.62)" }}>
            Price type
            <select className="mt-1 w-full px-3 py-2 rounded-md text-sm" style={fieldStyle()} value={form.priceType} onChange={(e) => setForm({ ...form, priceType: e.target.value })}>
              {PRICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-xs" style={{ color: "rgba(246,239,224,.62)" }}>
          Guest range (min billable)
          <input
            type="number"
            min={0}
            className="mt-1 w-full px-3 py-2 rounded-md text-sm"
            style={fieldStyle()}
            value={form.guestRange}
            onChange={(e) => setForm({ ...form, guestRange: Math.max(0, Number(e.target.value) || 0) })}
          />
          <span className="block mt-1 text-[0.7rem]" style={{ color: "rgba(246,239,224,.5)" }}>
            For per_guest: charge at least this many guests (e.g. 500). 0 = use actual guest count.
          </span>
        </label>
        <label className="block text-xs" style={{ color: "rgba(246,239,224,.62)" }}>
          Category
          <input list="addon-cats" className="mt-1 w-full px-3 py-2 rounded-md text-sm" style={fieldStyle()} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <datalist id="addon-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <label className="block text-xs" style={{ color: "rgba(246,239,224,.62)" }}>
          Choices (one per line, optional)
          <textarea className="mt-1 w-full px-3 py-2 rounded-md text-sm min-h-[80px]" style={fieldStyle()} value={form.choicesText} onChange={(e) => setForm({ ...form, choicesText: e.target.value })} />
        </label>
        <div className="flex gap-4 text-sm" style={{ color: "var(--ivory)" }}>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.isNv} onChange={(e) => setForm({ ...form, isNv: e.target.checked })} /> Non-veg</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
        </div>
        <button
          disabled={saving || !form.name.trim()}
          onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }}
          className="glossy-btn-gold w-full py-2.5 rounded-md font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Add-on"}
        </button>
      </div>
    </ModalShell>
  );
}
