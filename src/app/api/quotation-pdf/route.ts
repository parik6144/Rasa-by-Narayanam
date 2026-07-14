import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/permissions";
import { CONFIG } from "@/lib/rasa-data";
import { buildQuotationHTML, type QuotationAddonLine } from "@/lib/quotation-pdf-html";
import { addonLineTotal } from "@/lib/addon-pricing";

async function resolveLogoDataUri(origin: string): Promise<string> {
  const relative = (CONFIG.logo.startsWith("/") ? CONFIG.logo : `/${CONFIG.logo}`).replace(/^\//, "");
  const candidates = [
    path.join(/*turbopackIgnore: true*/ process.cwd(), "public", relative),
    path.join(/*turbopackIgnore: true*/ process.cwd(), "..", "public", relative),
  ];
  for (const file of candidates) {
    try {
      const buf = await readFile(file);
      const ext = path.extname(file).toLowerCase();
      const mime =
        ext === ".svg"
          ? "image/svg+xml"
          : ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : "image/png";
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      /* try next */
    }
  }
  return `${origin}/${relative}`;
}

function paiseToRupees(n: number | null | undefined): number {
  return Math.round((n || 0) / 100);
}

function parseMenu(raw: string | null | undefined): Record<string, string[]> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string[]>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function parseAddons(raw: string | null | undefined): QuotationAddonLine[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((a: Record<string, unknown>) => ({
      id: typeof a.id === "string" ? a.id : undefined,
      name: String(a.name || "Add-on"),
      price: Number(a.price) || 0,
      priceType: String(a.priceType || "per_event"),
      choice: a.choice != null ? String(a.choice) : null,
      guestRange: Number(a.guestRange) || 0,
    }));
  } catch {
    return [];
  }
}

function parseCustomDishes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    if (typeof parsed === "string" && parsed.trim()) return [parsed.trim()];
  } catch {
    if (raw.trim()) return [raw.trim()];
  }
  return [];
}

function formatEventDate(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "short",
  });
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const bookingId = url.searchParams.get("bookingId");
    const shareToken = url.searchParams.get("share");
    const origin = url.origin;
    const logo = await resolveLogoDataUri(origin);

    let menu: Record<string, string[]> = {};
    let addons: QuotationAddonLine[] = [];
    let customDishes: string[] = [];
    let guests = 100;
    let pkgName = "Custom";
    let pkgPrice = 0;
    let customerName = user.name || "Customer";
    let customerPhone = user.phone || "—";
    let customerEmail = user.email;
    let bookingRef = "QUOTATION";
    let eventDate = "";
    let venue = "";
    let city = "";
    let occasion = "";
    let notes = "";
    let status = "pending";
    let discount = 0;
    let discountNote = "";
    let storedSubtotal: number | null = null;
    let storedGst: number | null = null;
    let storedTotal: number | null = null;
    let storedAdvance: number | null = null;
    let storedBalance: number | null = null;

    if (bookingId) {
      const b = await db.booking.findUnique({
        where: { id: bookingId },
        include: { package: true, user: true, promoCode: true },
      });
      const isOwner = !!b && b.userId === user.id;
      const isStaff = isStaffRole(user.role);
      if (!b || (!isOwner && !isStaff)) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      menu = parseMenu(b.menuSnapshot);
      addons = parseAddons(b.addonsSnapshot);
      customDishes = parseCustomDishes(b.customDishes);
      guests = b.guests;
      pkgName = b.package?.name || "Custom";
      pkgPrice = b.package ? paiseToRupees(b.package.price) : 0;
      bookingRef = b.bookingRef;
      eventDate = formatEventDate(b.eventDate);
      venue = b.venue || "";
      city = b.city || "";
      occasion = b.occasion || "";
      notes = b.notes || "";
      status = b.status || "pending";
      discount = paiseToRupees(b.discount);
      discountNote =
        b.discountNote ||
        (b.promoCode
          ? `PROMO ${b.promoCode.code}${b.promoCode.label ? ` · ${b.promoCode.label}` : ""}`
          : "");

      // Always use booking owner for customer identity (admin must not appear as customer)
      customerName = b.user?.name || "Customer";
      customerPhone = b.user?.phone || "—";
      customerEmail = b.user?.email || "";

      if (b.total > 0) {
        storedSubtotal = paiseToRupees(b.subtotal);
        storedGst = paiseToRupees(b.gst);
        storedTotal = paiseToRupees(b.total);
        storedAdvance = paiseToRupees(b.advancePaid);
        storedBalance = paiseToRupees(b.balance);
      }
    } else if (shareToken) {
      const share = await db.quotationShare.findUnique({ where: { token: shareToken } });
      if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 });

      if (share.bookingId) {
        const b = await db.booking.findUnique({
          where: { id: share.bookingId },
          include: { package: true, user: true, promoCode: true },
        });
        if (b) {
          const isOwner = b.userId === user.id;
          const isStaff = isStaffRole(user.role);
          if (!isOwner && !isStaff) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
          }
          menu = parseMenu(b.menuSnapshot) || parseMenu(share.menuJson);
          addons = parseAddons(b.addonsSnapshot).length
            ? parseAddons(b.addonsSnapshot)
            : parseAddons(share.addonsJson);
          customDishes = parseCustomDishes(b.customDishes);
          guests = b.guests;
          pkgName = b.package?.name || "Custom";
          pkgPrice = b.package ? paiseToRupees(b.package.price) : 0;
          bookingRef = b.bookingRef;
          eventDate = formatEventDate(b.eventDate);
          venue = b.venue || "";
          city = b.city || "";
          occasion = b.occasion || "";
          notes = b.notes || "";
          status = b.status || "pending";
          discount = paiseToRupees(b.discount);
          discountNote =
            b.discountNote ||
            (b.promoCode
              ? `PROMO ${b.promoCode.code}${b.promoCode.label ? ` · ${b.promoCode.label}` : ""}`
              : "");
          customerName = b.user?.name || "Customer";
          customerPhone = b.user?.phone || "—";
          customerEmail = b.user?.email || "";
          if (b.total > 0) {
            storedSubtotal = paiseToRupees(b.subtotal);
            storedGst = paiseToRupees(b.gst);
            storedTotal = paiseToRupees(b.total);
            storedAdvance = paiseToRupees(b.advancePaid);
            storedBalance = paiseToRupees(b.balance);
          }
        }
      } else {
        menu = parseMenu(share.menuJson);
        addons = parseAddons(share.addonsJson);
        guests = share.guests;
        bookingRef = `SHARE-${share.token.slice(0, 8).toUpperCase()}`;
        if (share.total > 0) storedTotal = paiseToRupees(share.total);
      }
    } else {
      return NextResponse.json({ error: "bookingId or share required" }, { status: 400 });
    }

    const pkgTotal = pkgPrice * guests;
    const addonsTotal = addons.reduce((s, a) => s + addonLineTotal(a, guests), 0);
    const computedGross = pkgTotal + addonsTotal;
    const discountRupees = Math.max(0, discount);

    /**
     * Normalize commercials:
     * - Correct promo save: subtotal = net after discount → gross = subtotal + discount
     * - Broken edit save: subtotal still ≈ package+addons (gross) while discount field remains
     */
    let grossSubtotal = computedGross;
    if (storedSubtotal != null && storedSubtotal > 0) {
      const looksLikeGross =
        discountRupees > 0 &&
        Math.abs(storedSubtotal - computedGross) <= Math.max(100, Math.round(computedGross * 0.03));
      if (looksLikeGross) {
        grossSubtotal = storedSubtotal;
      } else {
        // treat stored subtotal as net after discount
        grossSubtotal = storedSubtotal + discountRupees;
      }
    }

    const netSubtotal = Math.max(0, grossSubtotal - discountRupees);
    let gstRupees = Math.round(netSubtotal * (CONFIG.gstPercent / 100));
    let totalRupees = netSubtotal + gstRupees;

    // Prefer stored totals when they already reflect the offer (total ≈ net + gst)
    if (storedTotal != null && storedTotal > 0) {
      const storedImpliesOffer =
        discountRupees === 0 ||
        Math.abs(storedTotal - (netSubtotal + Math.round(netSubtotal * (CONFIG.gstPercent / 100)))) <=
          Math.max(5, Math.round(storedTotal * 0.01));
      if (storedImpliesOffer) {
        totalRupees = storedTotal;
        if (storedGst != null) gstRupees = storedGst;
      }
    }

    const useStored = storedTotal != null && storedTotal > 0;
    const advance =
      useStored && storedAdvance != null
        ? storedAdvance
        : Math.round(totalRupees * (CONFIG.advancePercent / 100));
    const balance =
      useStored && storedBalance != null ? storedBalance : Math.max(0, totalRupees - advance);

    const html = buildQuotationHTML({
      logo,
      customerName,
      customerPhone,
      customerEmail,
      bookingRef,
      status,
      eventDate,
      venue,
      city,
      occasion,
      notes,
      pkgName,
      pkgPrice,
      guests,
      menu,
      addons,
      customDishes,
      pkgTotal,
      addonsTotal,
      subtotal: grossSubtotal,
      discount: discountRupees,
      discountNote,
      gst: gstRupees,
      total: totalRupees,
      advance,
      balance,
      issuedBy: isStaffRole(user.role) ? "admin" : "customer",
    });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
