// Global SPA state — Zustand (persists user in sessionStorage so refresh doesn't drop session UI)
import { create } from "zustand";

export type View =
  | "landing"
  | "booking"
  | "user-dashboard";

export type AuthModal = "none" | "login" | "register";

export type BookingStep =
  | "menu"
  | "addons"
  | "custom"
  | "guests"
  | "review"
  | "event"
  | "success";

export interface User {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  role: string;
  city?: string | null;
}

const USER_KEY = "rasa_user";

function loadStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function persistUser(u: User | null) {
  if (typeof window === "undefined") return;
  try {
    if (u) sessionStorage.setItem(USER_KEY, JSON.stringify(u));
    else sessionStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

interface AppState {
  view: View;
  authModal: AuthModal;
  user: User | null;
  sessionChecked: boolean;
  userUpdatedAt: number;
  menuBuilderPkgId: string | null;
  bookingStep: BookingStep;
  bookingSectionIndex: number;
  chatWidgetOpen: boolean;
  toast: string | null;
  editingBookingId: string | null;
  editingBookingRef: string | null;
  /** Promo already on the booking being edited */
  editingPromo: { code: string; discountRupees: number; totalRupees: number } | null;
  setView: (v: View) => void;
  setAuthModal: (m: AuthModal) => void;
  setUser: (u: User | null) => void;
  setSessionChecked: (b: boolean) => void;
  hydrateUser: () => void;
  openMenuBuilder: (pkgId: string) => void;
  openBookingEditor: (payload: {
    bookingId: string;
    bookingRef: string;
    packageSlug: string;
    guests: number;
    selectedDishes: Record<string, string[]>;
    selectedAddons: string[];
    addonChoices?: Record<string, string | null>;
    customDishes: string[];
    eventDate?: string;
    venue?: string;
    city?: string;
    occasion?: string;
    notes?: string;
    promoCode?: string | null;
    promoDiscountRupees?: number;
    promoTotalRupees?: number;
  }) => void;
  clearEditingBooking: () => void;
  closeBooking: () => void;
  setBookingStep: (s: BookingStep) => void;
  setBookingSectionIndex: (i: number) => void;
  setChatWidget: (b: boolean) => void;
  setToast: (t: string | null) => void;
  activeQuotation: {
    packageId: string | null;
    guests: number;
    selectedDishes: Record<string, string[]>;
    selectedAddons: string[];
    addonChoices: Record<string, string | null>;
    customDishes: string[];
    eventDate?: string;
    venue?: string;
    city?: string;
    occasion?: string;
    notes?: string;
  };
  setActiveQuotation: (q: Partial<AppState["activeQuotation"]>) => void;
  resetQuotation: () => void;
  closeMenuBuilder: () => void;
  setQuotationPanel: (b: boolean) => void;
  quotationPanelOpen: boolean;
}

const emptyQuote = {
  packageId: null as string | null,
  guests: 100,
  selectedDishes: {} as Record<string, string[]>,
  selectedAddons: [] as string[],
  addonChoices: {} as Record<string, string | null>,
  customDishes: [] as string[],
  eventDate: undefined as string | undefined,
  venue: undefined as string | undefined,
  city: undefined as string | undefined,
  occasion: undefined as string | undefined,
  notes: undefined as string | undefined,
};

export const useApp = create<AppState>((set) => ({
  view: "landing",
  authModal: "none",
  user: null,
  sessionChecked: false,
  userUpdatedAt: 0,
  menuBuilderPkgId: null,
  bookingStep: "menu",
  bookingSectionIndex: 0,
  chatWidgetOpen: false,
  toast: null,
  quotationPanelOpen: false,
  editingBookingId: null,
  editingBookingRef: null,
  editingPromo: null,
  activeQuotation: { ...emptyQuote },
  setView: (v) => set({ view: v }),
  setAuthModal: (m) => set({ authModal: m }),
  setUser: (u) => {
    persistUser(u);
    set({ user: u, userUpdatedAt: Date.now() });
  },
  setSessionChecked: (b) => set({ sessionChecked: b }),
  hydrateUser: () => {
    const u = loadStoredUser();
    if (u) set({ user: u });
  },
  openMenuBuilder: (pkgId) =>
    set({
      menuBuilderPkgId: pkgId,
      view: "booking",
      bookingStep: "menu",
      bookingSectionIndex: 0,
      editingBookingId: null,
      editingBookingRef: null,
      editingPromo: null,
      activeQuotation: { ...emptyQuote, packageId: pkgId },
    }),
  openBookingEditor: (payload) =>
    set({
      menuBuilderPkgId: payload.packageSlug,
      view: "booking",
      bookingStep: "addons",
      bookingSectionIndex: 0,
      editingBookingId: payload.bookingId,
      editingBookingRef: payload.bookingRef,
      editingPromo: payload.promoCode
        ? {
            code: payload.promoCode,
            discountRupees: Math.max(0, payload.promoDiscountRupees || 0),
            totalRupees: Math.max(0, payload.promoTotalRupees || 0),
          }
        : null,
      activeQuotation: {
        packageId: payload.packageSlug,
        guests: payload.guests || 100,
        selectedDishes: payload.selectedDishes || {},
        selectedAddons: payload.selectedAddons || [],
        addonChoices: payload.addonChoices || {},
        customDishes: payload.customDishes || [],
        eventDate: payload.eventDate,
        venue: payload.venue,
        city: payload.city,
        occasion: payload.occasion,
        notes: payload.notes,
      },
    }),
  clearEditingBooking: () =>
    set({ editingBookingId: null, editingBookingRef: null, editingPromo: null }),
  closeBooking: () =>
    set({
      menuBuilderPkgId: null,
      view: "landing",
      bookingStep: "menu",
      bookingSectionIndex: 0,
      quotationPanelOpen: false,
      editingBookingId: null,
      editingBookingRef: null,
      editingPromo: null,
    }),
  closeMenuBuilder: () =>
    set({
      menuBuilderPkgId: null,
      view: "landing",
      bookingStep: "menu",
      bookingSectionIndex: 0,
      editingBookingId: null,
      editingBookingRef: null,
      editingPromo: null,
    }),
  setBookingStep: (s) => set({ bookingStep: s }),
  setBookingSectionIndex: (i) => set({ bookingSectionIndex: i }),
  setQuotationPanel: (b) => {
    if (b) set({ bookingStep: "review", view: "booking" });
    else set({ quotationPanelOpen: false });
  },
  setChatWidget: (b) => set({ chatWidgetOpen: b }),
  setToast: (t) => set({ toast: t }),
  setActiveQuotation: (q) =>
    set((s) => ({ activeQuotation: { ...s.activeQuotation, ...q } })),
  resetQuotation: () =>
    set({
      activeQuotation: { ...emptyQuote },
      editingBookingId: null,
      editingBookingRef: null,
      editingPromo: null,
    }),
}));
