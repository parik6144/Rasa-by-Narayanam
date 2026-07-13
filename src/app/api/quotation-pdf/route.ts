// PDF Quotation — branded with logo, enterprise professional look
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CONFIG, PACKAGES, ADDONS } from "@/lib/rasa-data";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const bookingId = url.searchParams.get("bookingId");
    const shareToken = url.searchParams.get("share");

    let menu: Record<string, string[]> = {};
    let addons: Array<{ id: string; name: string; price: number; priceType: string }> = [];
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
    let discount = 0;
    let discountNote = "";

    if (bookingId) {
      const b = await db.booking.findUnique({ where: { id: bookingId }, include: { package: true } });
      if (!b || b.userId !== user.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      menu = b.menuSnapshot ? JSON.parse(b.menuSnapshot) : {};
      const addonsSnap = b.addonsSnapshot ? JSON.parse(b.addonsSnapshot) : [];
      addons = addonsSnap;
      guests = b.guests;
      pkgName = b.package?.name || "Custom";
      pkgPrice = b.package ? b.package.price / 100 : 0;
      bookingRef = b.bookingRef;
      eventDate = b.eventDate.toISOString().split("T")[0];
      venue = b.venue;
      city = b.city;
      discount = b.discount / 100;
      discountNote = b.discountNote || "";
    } else if (shareToken) {
      const share = await db.quotationShare.findUnique({ where: { token: shareToken } });
      if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 });
      menu = JSON.parse(share.menuJson);
      addons = JSON.parse(share.addonsJson || "[]");
      guests = share.guests;
    }

    // Calculate totals
    const pkgTotal = pkgPrice * guests;
    const addonsTotal = addons.reduce((s, a) => {
      if (a.priceType === "per_guest") return s + a.price * guests;
      if (a.priceType === "per_event") return s + a.price;
      return s + a.price;
    }, 0);
    const subtotal = pkgTotal + addonsTotal;
    const afterDiscount = subtotal - discount;
    const gst = Math.round(afterDiscount * (CONFIG.gstPercent / 100));
    const total = afterDiscount + gst;
    const advance = Math.round(total * (CONFIG.advancePercent / 100));

    // Build PDF as HTML (will be converted client-side, OR return HTML for print)
    // For simplicity, return a beautifully formatted HTML page that opens print dialog
    const html = buildQuotationHTML({
      logo: CONFIG.logo,
      customerName, customerPhone, customerEmail,
      bookingRef, eventDate, venue, city,
      pkgName, pkgPrice, guests,
      menu, addons,
      pkgTotal, addonsTotal, subtotal, discount, discountNote, gst, total, advance,
    });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function buildQuotationHTML(d: {
  logo: string; customerName: string; customerPhone: string; customerEmail: string;
  bookingRef: string; eventDate: string; venue: string; city: string;
  pkgName: string; pkgPrice: number; guests: number;
  menu: Record<string, string[]>;
  addons: Array<{ id: string; name: string; price: number; priceType: string }>;
  pkgTotal: number; addonsTotal: number; subtotal: number; discount: number; discountNote: string;
  gst: number; total: number; advance: number;
}) {
  const fmtMoney = (n: number) => "₹" + n.toLocaleString("en-IN");
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const menuRows = Object.entries(d.menu).map(([section, dishes]) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #E4D6BC;color:#9C2A38;font-weight:600;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">${section}</td><td style="padding:8px 0;border-bottom:1px solid #E4D6BC;color:#3a2733;font-size:12px;">${dishes.join(", ") || "—"}</td></tr>`
  ).join("");

  const addonRows = d.addons.map(a => {
    const price = a.priceType === "per_guest" ? a.price * d.guests : a.price;
    return `<tr><td style="padding:6px 0;border-bottom:1px solid #E4D6BC;color:#3a2733;font-size:12px;">${a.name}</td><td style="padding:6px 0;border-bottom:1px solid #E4D6BC;text-align:right;color:#9C2A38;font-weight:600;font-size:12px;">${fmtMoney(price)}</td></tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Rasa Quotation — ${d.bookingRef}</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..600&family=Hanken+Grotesk:wght@300;400;500;600;700&family=Tiro+Devanagari+Hindi&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Hanken Grotesk', sans-serif; background: #f5f1e8; color: #221421; padding: 24px; }
  .page { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 30px 80px -30px rgba(0,0,0,0.3); }
  .header { background: linear-gradient(135deg, #221421 0%, #2f1e2f 50%, #180d17 100%); padding: 40px 48px; color: #F6EFE0; position: relative; overflow: hidden; }
  .header::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.08), transparent); }
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 1; }
  .logo-wrap { display: flex; align-items: center; gap: 16px; }
  .logo { height: 64px; width: auto; filter: drop-shadow(0 0 12px rgba(226,182,88,0.3)); }
  .brand-text { font-family: 'Fraunces', serif; }
  .brand-text .name { font-size: 28px; letter-spacing: 0.14em; font-weight: 500; }
  .brand-text .name b { color: #E2B658; }
  .brand-text .sub { font-size: 9px; letter-spacing: 0.42em; text-transform: uppercase; color: rgba(246,239,224,0.6); margin-top: 2px; }
  .quote-meta { text-align: right; font-size: 10px; }
  .quote-meta .ref { font-family: 'Fraunces', serif; font-size: 18px; color: #E2B658; letter-spacing: 0.06em; }
  .quote-meta .date { color: rgba(246,239,224,0.6); margin-top: 4px; letter-spacing: 0.1em; text-transform: uppercase; }
  .taste-row { display: flex; gap: 6px; margin-top: 24px; }
  .taste-row span { width: 7px; height: 7px; border-radius: 50%; }
  .t1 { background: #E2B658; } .t2 { background: #AEBB55; } .t3 { background: #9FB2C4; }
  .t4 { background: #BE3F49; } .t5 { background: #547A56; } .t6 { background: #9C6E97; }

  .body { padding: 40px 48px; }
  .eyebrow { font-size: 9px; letter-spacing: 0.32em; text-transform: uppercase; color: #C6983A; font-weight: 600; }
  h1 { font-family: 'Fraunces', serif; font-size: 32px; color: #221421; margin: 4px 0 24px; font-weight: 500; }
  h1 em { font-style: italic; color: #C6983A; }

  .customer-card { background: linear-gradient(135deg, #F6EFE0, #EEE3CF); border: 1px solid #D4C896; border-radius: 8px; padding: 20px 24px; margin-bottom: 28px; }
  .customer-card .label { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #6e5a5f; font-weight: 600; }
  .customer-card .value { font-size: 13px; color: #221421; margin-bottom: 10px; }
  .customer-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }

  .section-title { font-family: 'Fraunces', serif; font-size: 16px; color: #221421; margin: 24px 0 8px; padding-bottom: 6px; border-bottom: 2px solid #C6983A; display: flex; justify-content: space-between; align-items: baseline; }
  .section-title .price { font-size: 12px; color: #9C2A38; font-weight: 600; font-family: 'Hanken Grotesk', sans-serif; }

  table { width: 100%; border-collapse: collapse; }
  .menu-table td { vertical-align: top; }

  .pricing { background: linear-gradient(135deg, #221421, #2f1e2f); color: #F6EFE0; border-radius: 10px; padding: 24px 28px; margin-top: 28px; }
  .pricing .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: rgba(246,239,224,0.8); }
  .pricing .row.total { border-top: 1px solid rgba(226,182,88,0.3); margin-top: 8px; padding-top: 14px; font-family: 'Fraunces', serif; font-size: 22px; color: #F6EFE0; }
  .pricing .row.total .val { color: #E2B658; }
  .pricing .row.advance { font-size: 12px; color: rgba(246,239,224,0.6); padding-top: 4px; }
  .pricing .row.advance .val { color: #BE3F49; font-weight: 600; }
  .pricing .row.discount { color: #BE3F49; }

  .terms { margin-top: 28px; padding: 18px 20px; background: rgba(156,42,56,0.05); border-left: 3px solid #9C2A38; border-radius: 4px; }
  .terms h4 { font-family: 'Fraunces', serif; font-size: 13px; color: #9C2A38; margin-bottom: 8px; letter-spacing: 0.04em; }
  .terms ul { list-style: none; font-size: 11px; color: #6e5a5f; line-height: 1.7; }
  .terms ul li::before { content: "·"; color: #C6983A; font-weight: bold; margin-right: 8px; }

  .footer { background: #180d17; color: rgba(246,239,224,0.6); padding: 24px 48px; text-align: center; font-size: 11px; }
  .footer .deva { font-family: 'Tiro Devanagari Hindi', serif; font-size: 20px; color: #E2B658; margin-bottom: 8px; }
  .footer .contact { margin-top: 8px; }
  .footer .contact a { color: #E2B658; text-decoration: none; }

  .print-btn { position: fixed; top: 20px; right: 20px; background: linear-gradient(180deg, #FFE5A0, #C6983A); color: #231318; border: none; padding: 12px 24px; border-radius: 30px; font-weight: 600; cursor: pointer; box-shadow: 0 8px 20px -6px rgba(198,152,58,0.5); z-index: 100; font-size: 14px; }
  .print-btn:hover { filter: brightness(1.1); }
  @media print { .print-btn { display: none; } body { padding: 0; background: #fff; } .page { box-shadow: none; border-radius: 0; } }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨️ Save as PDF</button>
<div class="page">
  <div class="header">
    <div class="header-row">
      <div class="logo-wrap">
        <img src="${d.logo}" alt="Rasa by Narayanam" class="logo" />
        <div class="brand-text">
          <div class="name">R<b>A</b>SA</div>
          <div class="sub">by Narayanam</div>
        </div>
      </div>
      <div class="quote-meta">
        <div class="ref">${d.bookingRef}</div>
        <div class="date">Issued ${today}</div>
      </div>
    </div>
    <div class="taste-row"><span class="t1"></span><span class="t2"></span><span class="t3"></span><span class="t4"></span><span class="t5"></span><span class="t6"></span></div>
  </div>

  <div class="body">
    <div class="eyebrow">Catering Quotation</div>
    <h1>May your table carry <em>all six tastes.</em></h1>

    <div class="customer-card">
      <div class="customer-grid">
        <div>
          <div class="label">Customer</div>
          <div class="value">${d.customerName}<br/>${d.customerPhone}</div>
        </div>
        <div>
          <div class="label">Event</div>
          <div class="value">${d.eventDate || "Date TBD"}<br/>${d.venue || "Venue TBD"}, ${d.city || ""}</div>
        </div>
        <div>
          <div class="label">Package & Guests</div>
          <div class="value">${d.pkgName}<br/>${d.guests} guests @ ₹${d.pkgPrice}/guest</div>
        </div>
      </div>
    </div>

    <div class="section-title">
      <span>Menu Selection</span>
      <span class="price">${fmtMoney(d.pkgTotal)}</span>
    </div>
    <table class="menu-table">
      ${menuRows || '<tr><td colspan="2" style="padding:12px 0;color:#6e5a5f;font-style:italic;">Menu details to be finalized</td></tr>'}
    </table>

    ${d.addons.length > 0 ? `
    <div class="section-title">
      <span>Add-ons</span>
      <span class="price">${fmtMoney(d.addonsTotal)}</span>
    </div>
    <table>${addonRows}</table>
    ` : ""}

    <div class="pricing">
      <div class="row"><span>Subtotal</span><span>${fmtMoney(d.subtotal)}</span></div>
      ${d.discount > 0 ? `<div class="row discount"><span>Discount ${d.discountNote ? "(" + d.discountNote + ")" : ""}</span><span>− ${fmtMoney(d.discount)}</span></div>` : ""}
      <div class="row"><span>GST @ ${CONFIG.gstPercent}%</span><span>${fmtMoney(d.gst)}</span></div>
      <div class="row total"><span>Estimated Total</span><span class="val">${fmtMoney(d.total)}</span></div>
      <div class="row advance"><span>Advance to book (${CONFIG.advancePercent}%)</span><span class="val">${fmtMoney(d.advance)}</span></div>
      <div class="row advance"><span>Balance (due ${CONFIG.editWindowDays} days before event)</span><span class="val">${fmtMoney(d.total - d.advance)}</span></div>
    </div>

    <div class="terms">
      <h4>Payment & Terms</h4>
      <ul>
        <li>${CONFIG.advancePercent}% advance to lock the booking date. Balance due ${CONFIG.editWindowDays} days before event.</li>
        <li>GST @ ${CONFIG.gstPercent}% applicable as per Indian catering regulations.</li>
        <li>Menu can be modified until ${CONFIG.editWindowDays} days before event. After that, menu is locked for kitchen preparation.</li>
        <li>Cancellation: 100% refund till T-7 days, 50% till T-3 days, 0% thereafter.</li>
        <li>Prices valid for 30 days from issue date.</li>
        <li>Food prepared in fully hygienic kitchen by trained professional chefs.</li>
        <li>Serving radius: Jamshedpur + 200km. Travel charges may apply for distant venues.</li>
      </ul>
    </div>
  </div>

  <div class="footer">
    <div class="deva">रस</div>
    Narayanam Foods &amp; Catering · Jamshedpur, Jharkhand<br/>
    <div class="contact">
      📞 ${CONFIG.phoneDisplay} &nbsp;·&nbsp; ✉️ ${CONFIG.email} &nbsp;·&nbsp; 🌐 ${CONFIG.website}<br/>
      📷 @${CONFIG.instaHandle} &nbsp;·&nbsp; Kitchen live ${CONFIG.launchDate}
    </div>
  </div>
</div>
<script>
  setTimeout(() => { if (confirm('Open print dialog to save this quotation as PDF?')) window.print(); }, 800);
</script>
</body>
</html>`;
}
