import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CONFIG } from "@/lib/rasa-data";
import { buildQuotationHTML, type QuotationAddonLine } from "@/lib/quotation-pdf-html";

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
        include: { package: true, user: true },
      });
      const isOwner = !!b && b.userId === user.id;
      const isAdmin = user.role === "admin";
      if (!b || (!isOwner && !isAdmin)) {
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
      discountNote = b.discountNote || "";

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
          include: { package: true, user: true },
        });
        if (b) {
          const isOwner = b.userId === user.id;
          const isAdmin = user.role === "admin";
          if (!isOwner && !isAdmin) {
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
          discountNote = b.discountNote || "";
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
    const addonsTotal = addons.reduce((s, a) => {
      if (a.priceType === "per_guest") return s + a.price * guests;
      return s + a.price;
    }, 0);
    const computedSubtotal = pkgTotal + addonsTotal;
    const afterDiscount = computedSubtotal - discount;
    const computedGst = Math.round(afterDiscount * (CONFIG.gstPercent / 100));
    const computedTotal = afterDiscount + computedGst;
    const computedAdvance = Math.round(computedTotal * (CONFIG.advancePercent / 100));
    const computedBalance = computedTotal - computedAdvance;

    const useStored = storedTotal != null && storedTotal > 0;
    const subtotal = useStored && storedSubtotal != null ? storedSubtotal : computedSubtotal;
    const gst = useStored && storedGst != null ? storedGst : computedGst;
    const total = useStored ? storedTotal! : computedTotal;
    // Respect ₹0 advance (pay later) when booking totals were persisted
    const advance =
      useStored && storedAdvance != null
        ? storedAdvance
        : Math.round(total * (CONFIG.advancePercent / 100));
    const balance =
      useStored && storedBalance != null ? storedBalance : Math.max(0, total - advance);

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
      subtotal,
      discount,
      discountNote,
      gst,
      total,
      advance,
      balance,
      issuedBy: user.role === "admin" ? "admin" : "customer",
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
