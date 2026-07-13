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
  if (priceType === "per_guest") return "/guest";
  if (priceType === "per_event") return "/event";
  return priceType || "";
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
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
    month: "short",
    year: "numeric",
  });
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);
  const validStr = validUntil.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const menuRows = Object.entries(d.menu)
    .map(([section, dishes]) => {
      const list = (dishes || []).join(", ") || "—";
      return `<tr>
        <td class="sec">${esc(section)}</td>
        <td>${esc(list)}</td>
      </tr>`;
    })
    .join("");

  const addonRows = d.addons
    .map((a) => {
      const line = a.priceType === "per_guest" ? a.price * d.guests : a.price;
      const name = a.choice ? `${a.name} (${a.choice})` : a.name;
      return `<tr>
        <td>${esc(name)}</td>
        <td class="nowrap">${fmtMoney(a.price)}${esc(fmtUnit(a.priceType))}</td>
        <td class="right">${fmtMoney(line)}</td>
      </tr>`;
    })
    .join("");

  const customRow =
    d.customDishes.length > 0
      ? `<tr><td class="sec">Custom</td><td>${esc(d.customDishes.join(", "))}</td></tr>`
      : "";

  const terms = [
    ...CONFIG.terms.slice(0, 6),
    `Menu editable until ${CONFIG.editWindowDays} days before the event; then kitchen-locked. Quote valid 30 days.`,
  ];
  const termLis = terms.map((t) => `<li>${esc(t)}</li>`).join("");

  const venueLine = [d.venue, d.city].filter(Boolean).join(", ") || "Venue TBD";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Quotation ${esc(d.bookingRef)} — Rasa by Narayanam</title>
<style>
  :root {
    --ink: #2c2228;
    --muted: #6e5f66;
    --line: #e8dfd0;
    --cream: #fbf7f0;
    --maroon: #9c2a38;
    --gold: #b8892d;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    background: #efe8dc;
    color: var(--ink);
    font-size: 11px;
    line-height: 1.35;
    padding: 12px;
  }
  .toolbar {
    position: sticky; top: 0; z-index: 20;
    max-width: 780px; margin: 0 auto 10px;
    display: flex; gap: 8px; align-items: center; justify-content: flex-end;
    padding: 8px 10px; background: #fff; border: 1px solid var(--line); border-radius: 8px;
  }
  .toolbar span { margin-right: auto; color: var(--muted); font-family: system-ui, sans-serif; font-size: 12px; }
  .toolbar button {
    font-family: system-ui, sans-serif; font-size: 12px; font-weight: 600;
    border: 1px solid var(--line); background: #fff; color: var(--ink);
    padding: 7px 12px; border-radius: 6px; cursor: pointer;
  }
  .toolbar button.primary { background: var(--maroon); color: #fff; border-color: var(--maroon); }

  .page {
    max-width: 780px; margin: 0 auto; background: #fff;
    border: 1px solid var(--line); padding: 18px 22px 16px;
  }

  /* Compact letterhead — light, inline */
  .head {
    display: flex; justify-content: space-between; align-items: center; gap: 12px;
    padding-bottom: 10px; border-bottom: 2px solid var(--gold); margin-bottom: 12px;
  }
  .brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .brand img { height: 42px; width: auto; display: block; object-fit: contain; }
  .brand .name { font-size: 20px; letter-spacing: 0.14em; font-weight: 700; color: var(--ink); line-height: 1; }
  .brand .name b { color: var(--gold); }
  .brand .sub { font-family: system-ui, sans-serif; font-size: 9px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--muted); margin-top: 3px; }
  .meta { text-align: right; font-family: system-ui, sans-serif; font-size: 10px; color: var(--muted); line-height: 1.45; white-space: nowrap; }
  .meta .ref { font-size: 14px; font-weight: 700; color: var(--maroon); letter-spacing: 0.04em; }
  .meta .badge {
    display: inline-block; margin-top: 3px; padding: 1px 7px; border-radius: 999px;
    border: 1px solid var(--line); background: var(--cream); color: var(--ink); font-size: 9px;
  }

  .doc-title {
    font-family: system-ui, sans-serif; font-size: 10px; letter-spacing: 0.22em;
    text-transform: uppercase; color: var(--gold); font-weight: 700; margin-bottom: 8px;
  }

  /* Inline info strip */
  .info {
    display: grid; grid-template-columns: 1.1fr 1.2fr 1fr; gap: 8px;
    background: var(--cream); border: 1px solid var(--line); border-radius: 6px;
    padding: 8px 10px; margin-bottom: 12px; font-family: system-ui, sans-serif;
  }
  .info .lbl { font-size: 8.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); font-weight: 700; margin-bottom: 2px; }
  .info .val { font-size: 11px; color: var(--ink); line-height: 1.35; }
  .info .val b { font-weight: 700; }

  .cols { display: grid; grid-template-columns: 1.45fr 1fr; gap: 14px; align-items: start; }
  .block-title {
    font-family: system-ui, sans-serif; font-size: 10px; letter-spacing: 0.16em;
    text-transform: uppercase; color: var(--maroon); font-weight: 700;
    border-bottom: 1px solid var(--line); padding-bottom: 4px; margin-bottom: 6px;
  }

  table { width: 100%; border-collapse: collapse; font-family: system-ui, sans-serif; font-size: 10.5px; }
  table.menu td { padding: 3px 0; vertical-align: top; border-bottom: 1px solid #f1ebe1; }
  table.menu td.sec {
    width: 28%; padding-right: 8px; color: var(--maroon); font-weight: 700;
    font-size: 9.5px; letter-spacing: 0.04em; text-transform: uppercase;
  }
  table.addons th {
    text-align: left; font-size: 8.5px; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--muted); border-bottom: 1px solid var(--line); padding: 3px 4px; font-weight: 700;
  }
  table.addons td { padding: 3px 4px; border-bottom: 1px solid #f1ebe1; }
  .right { text-align: right; }
  .nowrap { white-space: nowrap; }

  /* Light commercial box — not dark */
  .totals {
    background: #fff; border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px;
    font-family: system-ui, sans-serif;
  }
  .totals .row { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; font-size: 10.5px; color: var(--ink); }
  .totals .row.dim { color: var(--muted); }
  .totals .row.disc { color: var(--maroon); }
  .totals .row.grand {
    margin-top: 4px; padding-top: 6px; border-top: 1.5px solid var(--gold);
    font-size: 13px; font-weight: 700; color: var(--ink);
  }
  .totals .row.grand .v { color: var(--maroon); }
  .pay { margin-top: 6px; font-size: 9.5px; color: var(--muted); line-height: 1.4; }

  .notes {
    margin-top: 10px; padding: 6px 8px; background: var(--cream); border-left: 2px solid var(--gold);
    font-family: system-ui, sans-serif; font-size: 10px; color: var(--muted);
  }
  .notes b { color: var(--ink); }

  .terms {
    margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--line);
    font-family: system-ui, sans-serif;
  }
  .terms h4 { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--maroon); margin-bottom: 4px; }
  .terms ol { padding-left: 14px; color: var(--muted); font-size: 9px; line-height: 1.4; columns: 2; column-gap: 16px; }
  .terms li { margin-bottom: 2px; break-inside: avoid; }

  .foot {
    margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--line);
    display: flex; justify-content: space-between; gap: 12px;
    font-family: system-ui, sans-serif; font-size: 9.5px; color: var(--muted);
  }
  .foot .co { color: var(--ink); font-weight: 700; font-size: 11px; }

  @page { size: A4; margin: 10mm; }
  @media print {
    body { background: #fff; padding: 0; }
    .toolbar { display: none !important; }
    .page { border: none; max-width: none; padding: 0; }
    .terms ol { columns: 2; }
  }
  @media (max-width: 640px) {
    .info, .cols { grid-template-columns: 1fr; }
    .terms ol { columns: 1; }
    .meta { white-space: normal; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <span>${esc(d.bookingRef)}</span>
    <button type="button" onclick="window.close()">Close</button>
    <button type="button" class="primary" onclick="window.print()">Save / Print PDF</button>
  </div>

  <article class="page">
    <header class="head">
      <div class="brand">
        <img src="${esc(d.logo)}" alt="Rasa by Narayanam" />
        <div>
          <div class="name">R<b>A</b>SA</div>
          <div class="sub">by Narayanam</div>
        </div>
      </div>
      <div class="meta">
        <div class="ref">${esc(d.bookingRef)}</div>
        <div class="badge">${esc(statusLabel(d.status))}</div>
        <div>Issued ${esc(today)} · Valid ${esc(validStr)}</div>
      </div>
    </header>

    <div class="doc-title">Catering quotation</div>

    <div class="info">
      <div>
        <div class="lbl">Bill to</div>
        <div class="val"><b>${esc(d.customerName)}</b><br/>${esc(d.customerPhone || "—")}<br/>${esc(d.customerEmail || "—")}</div>
      </div>
      <div>
        <div class="lbl">Event</div>
        <div class="val"><b>${esc(d.eventDate || "Date TBD")}</b><br/>${esc(venueLine)}<br/>${esc(d.occasion || "Occasion TBD")}</div>
      </div>
      <div>
        <div class="lbl">Package</div>
        <div class="val"><b>${esc(d.pkgName)}</b><br/>${d.guests} guests · ${fmtMoney(d.pkgPrice)}/guest</div>
      </div>
    </div>

    <div class="cols">
      <div>
        <div class="block-title">Menu</div>
        <table class="menu">
          <tbody>
            ${menuRows || `<tr><td colspan="2" style="color:var(--muted);font-style:italic;">Menu to be finalized</td></tr>`}
            ${customRow}
          </tbody>
        </table>

        ${
          d.addons.length > 0
            ? `<div class="block-title" style="margin-top:10px">Add-ons</div>
        <table class="addons">
          <thead><tr><th>Item</th><th>Rate</th><th class="right">Amount</th></tr></thead>
          <tbody>${addonRows}</tbody>
        </table>`
            : ""
        }

        ${
          d.notes
            ? `<div class="notes"><b>Notes:</b> ${esc(d.notes)}</div>`
            : ""
        }
      </div>

      <div>
        <div class="block-title">Commercials</div>
        <div class="totals">
          <div class="row"><span>Package × ${d.guests}</span><span>${fmtMoney(d.pkgTotal)}</span></div>
          <div class="row"><span>Add-ons</span><span>${fmtMoney(d.addonsTotal)}</span></div>
          <div class="row dim"><span>Subtotal</span><span>${fmtMoney(d.subtotal)}</span></div>
          ${
            d.discount > 0
              ? `<div class="row disc"><span>Discount${d.discountNote ? ` (${esc(d.discountNote)})` : ""}</span><span>− ${fmtMoney(d.discount)}</span></div>`
              : ""
          }
          <div class="row"><span>GST @ ${CONFIG.gstPercent}%</span><span>${fmtMoney(d.gst)}</span></div>
          <div class="row grand"><span>Total</span><span class="v">${fmtMoney(d.total)}</span></div>
          <div class="row dim"><span>Advance (${CONFIG.advancePercent}%)</span><span>${fmtMoney(d.advance)}</span></div>
          <div class="row dim"><span>Balance</span><span>${fmtMoney(d.balance)}</span></div>
          <div class="pay">${esc(CONFIG.paymentTerms)}</div>
        </div>
      </div>
    </div>

    <div class="terms">
      <h4>Terms</h4>
      <ol>${termLis}</ol>
    </div>

    <footer class="foot">
      <div>
        <div class="co">Narayanam Foods &amp; Catering</div>
        ${esc(CONFIG.city)} · ${esc(CONFIG.phoneDisplay)} · ${esc(CONFIG.email)}
      </div>
      <div style="text-align:right">
        ${esc(CONFIG.website)} · Kitchen live ${esc(CONFIG.launchDate)}<br/>
        Prepared for the guest · FSSAI pending
      </div>
    </footer>
  </article>
</body>
</html>`;
}
