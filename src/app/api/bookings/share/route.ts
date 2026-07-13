// Quotation share — generate shareable link + WhatsApp message to boss
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CONFIG } from "@/lib/rasa-data";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { bookingId, menu, addons, guests, total } = body as {
      bookingId?: string; menu?: unknown; addons?: unknown; guests?: number; total?: number;
    };

    const token = Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const share = await db.quotationShare.create({
      data: {
        token,
        bookingId: bookingId || null,
        menuJson: JSON.stringify(menu || {}),
        addonsJson: JSON.stringify(addons || []),
        guests: guests || 100,
        total: (total || 0) * 100,
        expiresAt,
      },
    });

    // Build WhatsApp message to boss
    const shareUrl = `${req.nextUrl.origin}/?share=${share.token}`;
    const waMsg = `🍽️ *NEW QUOTATION from Rasa website*\n\n` +
      `👤 *Customer:* ${user.name || user.email}\n` +
      `📞 *Phone:* ${user.phone || "—"}\n` +
      `👥 *Guests:* ${guests || 100}\n` +
      `💰 *Estimated Total:* ₹${(total || 0).toLocaleString("en-IN")}\n\n` +
      `📎 *View full quotation:*\n${shareUrl}\n\n` +
      `_Auto-sent from rasakitchen.co_`;

    const waUrl = `https://wa.me/${CONFIG.bossWhatsApp}?text=${encodeURIComponent(waMsg)}`;

    return NextResponse.json({ shareToken: share.token, shareUrl, whatsappUrl: waUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
