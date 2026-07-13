"use client";
import { create } from "zustand";
import type { Package, Addon } from "@/lib/rasa-data";
import { PACKAGES as STATIC_PACKAGES, ADDONS as STATIC_ADDONS } from "@/lib/rasa-data";

interface CatalogState {
  packages: Package[];
  addons: Addon[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  loadCatalog: () => Promise<void>;
  getPackage: (id: string) => Package | undefined;
  getAddon: (id: string) => Addon | undefined;
}

export const useCatalog = create<CatalogState>((set, get) => ({
  packages: STATIC_PACKAGES,
  addons: STATIC_ADDONS,
  loaded: false,
  loading: false,
  error: null,

  loadCatalog: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      // Ensure DB is seeded, then load dynamic catalog
      await fetch("/api/seed", { method: "POST" }).catch(() => null);
      const res = await fetch("/api/catalog");
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load catalog");
      if (!data.packages?.length) throw new Error("Catalog empty");
      set({
        packages: data.packages,
        addons: data.addons?.length ? data.addons : STATIC_ADDONS,
        loaded: true,
        loading: false,
      });
    } catch (e: unknown) {
      console.warn("[catalog] falling back to static data", e);
      set({
        packages: STATIC_PACKAGES,
        addons: STATIC_ADDONS,
        loaded: true,
        loading: false,
        error: e instanceof Error ? e.message : "Catalog load failed",
      });
    }
  },

  getPackage: (id) => get().packages.find((p) => p.id === id),
  getAddon: (id) => get().addons.find((a) => a.id === id),
}));
