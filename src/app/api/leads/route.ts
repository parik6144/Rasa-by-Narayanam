// Public lead capture — enquiry form + notify admins
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, eventDate, guests, city, venue, occasion, message, packageInterest } = body as {
      name?: string; phone?: string; email?: string; eventDate?: string; guests?: number;
      city?: string; venue?: string; occasion?: string; message?: string; packageInterest?: string;
    };
    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone required" }, { status: 422 });
    }

    let priority = "normal";
    if (eventDate) {
      const d = new Date(eventDate);
      const days = Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (days <= 7) priority = "urgent";
      else if (days <= 30) priority = "high";
    }

    const lead = await db.lead.create({
      data: {
        name,
        phone,
        email: email || null,
        eventDate: eventDate ? new Date(eventDate) : null,
        guests: guests || null,
        city: city || null,
        venue: venue || null,
        occasion: occasion || null,
        message: message || null,
        packageInterest: packageInterest || null,
        priority,
        source: "website",
        status: "new",
      },
    });

    // Notify all admins — shows in sidebar badge + notifications panel
    const admins = await db.user.findMany({
      where: { role: "admin" },
      select: { id: true },
    });

    const eventBit = eventDate
      ? ` · Event ${new Date(eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
      : "";
    const guestBit = guests ? ` · ${guests} guests` : "";
    const cityBit = city ? ` · ${city}` : "";
    const title = priority === "urgent" ? `🔥 Urgent lead: ${name}` : `New enquiry: ${name}`;
    const notifBody = `${phone}${occasion ? ` · ${occasion}` : ""}${eventBit}${guestBit}${cityBit}${message ? `\n"${message.slice(0, 120)}"` : ""}`;

    if (admins.length > 0) {
      await db.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: "lead_new",
          title,
          body: notifBody,
          link: "/admin#leads",
          meta: JSON.stringify({ leadId: lead.id, priority, phone, source: "contact" }),
        })),
      });
    }

    return NextResponse.json({ ok: true, leadId: lead.id, priority });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
