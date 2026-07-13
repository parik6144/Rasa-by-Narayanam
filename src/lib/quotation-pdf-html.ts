import { CONFIG } from "@/lib/rasa-data";

export type QuotationAddonLine = {
  id?: string;
  name: string;
  price: number;
  priceType: string;
  choice?: string | null;
};

export type QuotationPdfData = {
  logo: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  bookingRef: string;
  status: string;
  eventDate: string;
  venue: string;
  city: string;
  occasion: string;
  notes: string;
  pkgName: string;
  pkgPrice: number;
  guests: number;
  menu: Record<string, string[]>;
  addons: QuotationAddonLine[];
  customDishes: string[];
  pkgTotal: number;
  addonsTotal: number;
  subtotal: number;
  discount: number;
  discountNote: string;
  gst: number;
  total: number;
  advance: number;
  balance: number;
  issuedBy: "admin" | "customer";
};

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtMoney(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function fmtUnit(priceType: string): string {
  if (priceType === "per_guest") return "Per guest";
  if (priceType === "per_event") return "Per event";
  return priceType || "—";
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending confirmation",
    confirmed: "Confirmed",
    menu_locked: "Menu locked",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return map[status] || status || "Quotation";
}

export function buildQuotationHTML(d: QuotationPdfData): string {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);
  const validStr = validUntil.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const menuSections = Object.entries(d.menu)
    .map(([section, dishes]) => {
      const chips = (dishes || [])
        .map((dish) => `<span class="chip">${esc(dish)}</span>`)
        .join("");
      return `<div class="menu-block">
        <div class="menu-block-head">${esc(section)}</div>
        <div class="chips">${chips || `<span class="muted">To be finalized</span>`}</div>
      </div>`;
    })
    .join("");

  const addonRows = d.addons
    .map((a) => {
      const unit = a.price;
      const line =
        a.priceType === "per_guest" ? a.price * d.guests : a.price;
      const name = a.choice ? `${a.name} — ${a.choice}` : a.name;
      return `<tr>
        <td>${esc(name)}</td>
        <td class="center">${esc(fmtUnit(a.priceType))}</td>
        <td class="right">${fmtMoney(unit)}</td>
        <td class="right strong">${fmtMoney(line)}</td>
      </tr>`;
    })
    .join("");

  const customBlock =
    d.customDishes.length > 0
      ? `<div class="menu-block accent">
          <div class="menu-block-head">Custom requests</div>
          <div class="chips">${d.customDishes
            .map((x) => `<span class="chip">${esc(x)}</span>`)
            .join("")}</div>
        </div>`
      : "";

  const terms = [
    ...CONFIG.terms,
    `${CONFIG.advancePercent}% advance locks the booking date. Menu may be edited until ${CONFIG.editWindowDays} days before the event; thereafter it is locked for kitchen preparation.`,
    `Cancellation: full refund until T-7 days, 50% until T-3 days, none thereafter. Prices in this quotation are valid for 30 days from issue.`,
  ];

  const termLis = terms.map((t) => `<li>${esc(t)}</li>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Quotation ${esc(d.bookingRef)} — Rasa by Narayanam</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Source+Sans+3:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  :root {
    --ink: #1a1218;
    --muted: #6b5a62;
    --line: #e6dcc8;
    --cream: #faf6ee;
    --paper: #ffffff;
    --maroon: #8b1e2d;
    --maroon-deep: #5c1420;
    --gold: #b8892d;
    --gold-soft: #d4b56a;
    --header: #160e14;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #e8e0d2; color: var(--ink); font-family: "Source Sans 3", system-ui, sans-serif; }
  body { padding: 20px 12px 48px; }
  .toolbar {
    position: sticky; top: 0; z-index: 50;
    display: flex; gap: 10px; justify-content: flex-end; align-items: center;
    max-width: 210mm; margin: 0 auto 14px;
    padding: 10px 12px; background: rgba(22,14,20,.92); border-radius: 10px;
    backdrop-filter: blur(8px);
  }
  .toolbar span { color: rgba(250,246,238,.7); font-size: 12px; margin-right: auto; }
  .toolbar button {
    border: 0; cursor: pointer; font-weight: 600; font-size: 13px;
    padding: 10px 16px; border-radius: 8px;
    background: linear-gradient(180deg, #f0d48a, #c6983a); color: #231318;
  }
  .toolbar button.ghost {
    background: transparent; color: #faf6ee; border: 1px solid rgba(250,246,238,.35);
  }

  .sheet {
    width: 210mm; max-width: 100%; margin: 0 auto;
    background: var(--paper);
    box-shadow: 0 24px 60px -28px rgba(0,0,0,.45);
  }

  .letterhead {
    background: linear-gradient(145deg, #160e14 0%, #2a1824 55%, #120b10 100%);
    color: #faf6ee; padding: 28px 32px 24px; position: relative; overflow: hidden;
  }
  .letterhead::after {
    content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 3px;
    background: linear-gradient(90deg, var(--maroon), var(--gold), var(--maroon));
  }
  .lh-top { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; }
  .brand { display: flex; gap: 14px; align-items: center; }
  .brand img { height: 58px; width: auto; object-fit: contain; }
  .brand-name { font-family: "Cormorant Garamond", Georgia, serif; font-size: 30px; letter-spacing: .12em; font-weight: 600; line-height: 1; }
  .brand-name b { color: var(--gold-soft); font-weight: 700; }
  .brand-sub { font-size: 10px; letter-spacing: .38em; text-transform: uppercase; color: rgba(250,246,238,.55); margin-top: 6px; }
  .brand-tag { font-size: 11px; color: rgba(250,246,238,.7); margin-top: 8px; max-width: 280px; line-height: 1.45; }
  .meta { text-align: right; min-width: 180px; }
  .meta .doc-type { font-size: 10px; letter-spacing: .28em; text-transform: uppercase; color: var(--gold-soft); font-weight: 600; }
  .meta .ref { font-family: "Cormorant Garamond", Georgia, serif; font-size: 22px; color: #fff; margin-top: 4px; letter-spacing: .04em; }
  .meta .pill {
    display: inline-block; margin-top: 10px; padding: 4px 10px; border-radius: 999px;
    font-size: 10px; letter-spacing: .08em; text-transform: uppercase;
    background: rgba(184,137,45,.18); color: var(--gold-soft); border: 1px solid rgba(184,137,45,.35);
  }
  .meta dl { margin-top: 12px; font-size: 11px; color: rgba(250,246,238,.65); line-height: 1.7; }
  .meta dt { display: inline; color: rgba(250,246,238,.45); }
  .meta dd { display: inline; margin: 0 0 0 6px; color: #faf6ee; }
  .meta dd::after { content: ""; display: block; }

  .body { padding: 28px 32px 20px; }
  .title-row { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; margin-bottom: 18px; }
  .title-row h1 {
    font-family: "Cormorant Garamond", Georgia, serif; font-weight: 600;
    font-size: 28px; color: var(--ink); line-height: 1.15;
  }
  .title-row h1 em { font-style: italic; color: var(--gold); }
  .title-row .eyebrow { font-size: 10px; letter-spacing: .3em; text-transform: uppercase; color: var(--maroon); font-weight: 700; }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 22px; }
  .card {
    border: 1px solid var(--line); border-radius: 8px; padding: 14px 16px;
    background: linear-gradient(180deg, #fffefb, var(--cream));
    page-break-inside: avoid;
  }
  .card h3 {
    font-size: 10px; letter-spacing: .22em; text-transform: uppercase;
    color: var(--maroon); font-weight: 700; margin-bottom: 10px;
  }
  .card .line { font-size: 13px; line-height: 1.55; color: var(--ink); }
  .card .line strong { font-weight: 600; }
  .card .muted { color: var(--muted); font-size: 12px; }

  .section { margin-top: 22px; page-break-inside: avoid; }
  .section-head {
    display: flex; justify-content: space-between; align-items: baseline;
    border-bottom: 2px solid var(--gold); padding-bottom: 6px; margin-bottom: 12px;
  }
  .section-head h2 {
    font-family: "Cormorant Garamond", Georgia, serif; font-size: 18px; font-weight: 600;
  }
  .section-head .amt { font-size: 13px; font-weight: 700; color: var(--maroon); }

  .menu-block { margin-bottom: 12px; page-break-inside: avoid; }
  .menu-block-head {
    font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
    color: var(--maroon); margin-bottom: 6px;
  }
  .menu-block.accent .menu-block-head { color: var(--gold); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    display: inline-block; padding: 4px 10px; border-radius: 999px;
    background: #f3ebe0; border: 1px solid #e2d5bf; font-size: 11.5px; color: var(--ink);
  }
  .muted { color: var(--muted); font-style: italic; font-size: 12px; }

  table.lines { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  table.lines th {
    text-align: left; font-size: 10px; letter-spacing: .12em; text-transform: uppercase;
    color: var(--muted); border-bottom: 1px solid var(--line); padding: 8px 6px; font-weight: 700;
  }
  table.lines td { padding: 9px 6px; border-bottom: 1px solid #f0e8da; vertical-align: top; }
  table.lines .right { text-align: right; }
  table.lines .center { text-align: center; }
  table.lines .strong { font-weight: 700; color: var(--maroon-deep); }

  .commercial {
    margin-top: 22px; border-radius: 10px; overflow: hidden;
    border: 1px solid #2a1824; page-break-inside: avoid;
  }
  .commercial .head {
    background: var(--header); color: #faf6ee; padding: 12px 18px;
    font-family: "Cormorant Garamond", Georgia, serif; font-size: 17px;
  }
  .commercial .rows { padding: 8px 18px 14px; background: #1c1219; color: rgba(250,246,238,.82); }
  .commercial .row { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; font-size: 13px; }
  .commercial .row.dim { color: rgba(250,246,238,.55); font-size: 12px; }
  .commercial .row.discount { color: #f0a8a8; }
  .commercial .row.total {
    border-top: 1px solid rgba(212,181,106,.35); margin-top: 6px; padding-top: 12px;
    font-family: "Cormorant Garamond", Georgia, serif; font-size: 22px; color: #fff;
  }
  .commercial .row.total .val { color: var(--gold-soft); }
  .pay-note {
    margin-top: 10px; padding: 10px 12px; border-radius: 6px;
    background: rgba(184,137,45,.12); border: 1px solid rgba(184,137,45,.28);
    font-size: 11.5px; color: rgba(250,246,238,.78); line-height: 1.5;
  }

  .notes-box {
    margin-top: 16px; padding: 12px 14px; border-left: 3px solid var(--gold);
    background: #faf6ee; font-size: 12px; color: var(--muted); line-height: 1.55;
    page-break-inside: avoid;
  }
  .notes-box strong { color: var(--ink); display: block; margin-bottom: 4px; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; }

  .terms {
    margin-top: 22px; padding: 14px 16px; border: 1px solid var(--line); border-radius: 8px;
    background: #fffdf9; page-break-inside: avoid;
  }
  .terms h3 {
    font-family: "Cormorant Garamond", Georgia, serif; font-size: 16px; color: var(--maroon);
    margin-bottom: 8px;
  }
  .terms ol { padding-left: 18px; font-size: 11px; color: var(--muted); line-height: 1.65; }
  .terms li { margin-bottom: 4px; }

  .signoff {
    margin-top: 28px; display: grid; grid-template-columns: 1.2fr 1fr; gap: 18px;
    page-break-inside: avoid;
  }
  .signoff .company { font-size: 12px; color: var(--muted); line-height: 1.6; }
  .signoff .company .name {
    font-family: "Cormorant Garamond", Georgia, serif; font-size: 18px; color: var(--ink);
    margin-bottom: 4px;
  }
  .sign-line {
    margin-top: 36px; border-top: 1px solid var(--line); padding-top: 8px;
    font-size: 11px; color: var(--muted); text-align: center;
  }

  .footer {
    margin-top: 24px; padding: 16px 32px 22px; background: #120b10; color: rgba(250,246,238,.55);
    text-align: center; font-size: 11px; line-height: 1.6;
  }
  .footer .deva {
    font-family: "Cormorant Garamond", Georgia, serif; font-size: 22px; color: var(--gold-soft);
    margin-bottom: 4px;
  }
  .footer a { color: var(--gold-soft); text-decoration: none; }

  @page { size: A4; margin: 12mm; }
  @media print {
    body { background: #fff; padding: 0; }
    .toolbar { display: none !important; }
    .sheet { box-shadow: none; width: auto; }
    a { color: inherit; text-decoration: none; }
  }
  @media (max-width: 720px) {
    .grid-2, .signoff, .lh-top { grid-template-columns: 1fr; display: grid; }
    .meta { text-align: left; }
    .body, .letterhead { padding-left: 18px; padding-right: 18px; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <span>Rasa quotation · ${esc(d.bookingRef)}</span>
    <button type="button" class="ghost" onclick="window.close()">Close</button>
    <button type="button" onclick="window.print()">Save / Print PDF</button>
  </div>

  <article class="sheet">
    <header class="letterhead">
      <div class="lh-top">
        <div class="brand">
          <img src="${esc(d.logo)}" alt="Rasa by Narayanam" />
          <div>
            <div class="brand-name">R<b>A</b>SA</div>
            <div class="brand-sub">by Narayanam</div>
            <div class="brand-tag">Premium celebration catering · Hygienic kitchen · Honestly priced</div>
          </div>
        </div>
        <div class="meta">
          <div class="doc-type">Catering quotation</div>
          <div class="ref">${esc(d.bookingRef)}</div>
          <div class="pill">${esc(statusLabel(d.status))}</div>
          <dl>
            <dt>Issued</dt><dd>${esc(today)}</dd>
            <dt>Valid until</dt><dd>${esc(validStr)}</dd>
          </dl>
        </div>
      </div>
    </header>

    <div class="body">
      <div class="title-row">
        <div>
          <div class="eyebrow">Formal estimate</div>
          <h1>May your table carry <em>all six tastes.</em></h1>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3>Bill to</h3>
          <div class="line"><strong>${esc(d.customerName)}</strong></div>
          <div class="line muted">${esc(d.customerPhone || "—")}</div>
          <div class="line muted">${esc(d.customerEmail || "—")}</div>
        </div>
        <div class="card">
          <h3>Event</h3>
          <div class="line"><strong>${esc(d.eventDate || "Date TBD")}</strong></div>
          <div class="line">${esc([d.venue, d.city].filter(Boolean).join(", ") || "Venue TBD")}</div>
          <div class="line muted">${esc(d.occasion || "Occasion TBD")} · ${d.guests} guests</div>
          <div class="line muted" style="margin-top:6px">${esc(d.pkgName)} @ ${fmtMoney(d.pkgPrice)} / guest</div>
        </div>
      </div>

      <div class="commercial">
        <div class="head">Commercial summary</div>
        <div class="rows">
          <div class="row"><span>Package (${esc(d.pkgName)} × ${d.guests})</span><span>${fmtMoney(d.pkgTotal)}</span></div>
          <div class="row"><span>Add-ons</span><span>${fmtMoney(d.addonsTotal)}</span></div>
          <div class="row dim"><span>Subtotal</span><span>${fmtMoney(d.subtotal)}</span></div>
          ${
            d.discount > 0
              ? `<div class="row discount"><span>Discount${d.discountNote ? ` (${esc(d.discountNote)})` : ""}</span><span>− ${fmtMoney(d.discount)}</span></div>`
              : ""
          }
          <div class="row"><span>GST @ ${CONFIG.gstPercent}%</span><span>${fmtMoney(d.gst)}</span></div>
          <div class="row total"><span>Estimated total</span><span class="val">${fmtMoney(d.total)}</span></div>
          <div class="row dim"><span>Advance to book (${CONFIG.advancePercent}%)</span><span>${fmtMoney(d.advance)}</span></div>
          <div class="row dim"><span>Balance due</span><span>${fmtMoney(d.balance)}</span></div>
          <div class="pay-note">${esc(CONFIG.paymentTerms)}</div>
        </div>
      </div>

      <section class="section">
        <div class="section-head">
          <h2>Menu selection</h2>
          <div class="amt">${fmtMoney(d.pkgTotal)}</div>
        </div>
        ${menuSections || `<p class="muted">Menu details to be finalized with the kitchen.</p>`}
        ${customBlock}
      </section>

      ${
        d.addons.length > 0
          ? `<section class="section">
        <div class="section-head">
          <h2>Add-ons</h2>
          <div class="amt">${fmtMoney(d.addonsTotal)}</div>
        </div>
        <table class="lines">
          <thead>
            <tr><th>Item</th><th class="center">Unit</th><th class="right">Rate</th><th class="right">Amount</th></tr>
          </thead>
          <tbody>${addonRows}</tbody>
        </table>
      </section>`
          : ""
      }

      ${
        d.notes
          ? `<div class="notes-box"><strong>Notes</strong>${esc(d.notes)}</div>`
          : ""
      }

      <div class="terms">
        <h3>Terms &amp; conditions</h3>
        <ol>${termLis}</ol>
      </div>

      <div class="signoff">
        <div class="company">
          <div class="name">Narayanam Foods &amp; Catering</div>
          Kitchen · ${esc(CONFIG.city)}, Jharkhand<br />
          Serving ${esc(CONFIG.city)} &amp; 200 km radius<br />
          ${esc(CONFIG.phoneDisplay)} · ${esc(CONFIG.email)}<br />
          <a href="${esc(CONFIG.websiteUrl)}">${esc(CONFIG.website)}</a>
        </div>
        <div>
          <div class="sign-line">Authorised quotation · Prepared for the guest</div>
        </div>
      </div>
    </div>

    <footer class="footer">
      <div class="deva">रस</div>
      Rasa by Narayanam · Kitchen live ${esc(CONFIG.launchDate)} · FSSAI licence pending<br />
      This document is a commercial estimate. Final invoice may reflect confirmed guest count and approved menu changes.
    </footer>
  </article>
</body>
</html>`;
}
