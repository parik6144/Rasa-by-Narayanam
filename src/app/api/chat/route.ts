// Chat: list conversations + messages (logged-in or guest via name/email)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getCurrentUser,
  createSessionToken,
  setSessionCookie,
  setSessionCookieStore,
  hashPassword,
} from "@/lib/auth";

function guestEmailFromContact(contact: string): string {
  const trimmed = contact.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  const digits = trimmed.replace(/\D/g, "");
  return `guest-${digits || Date.now()}@rasa.local`;
}

async function ensureGuestUser(name: string, contact: string) {
  const email = guestEmailFromContact(contact);
  const phone = contact.includes("@") ? null : contact.replace(/\D/g, "") || null;
  let user = await db.user.findUnique({ where: { email } });
  if (!user && phone) {
    user = await db.user.findFirst({ where: { phone } });
  }
  if (!user) {
    user = await db.user.create({
      data: {
        email,
        name: name.trim() || "Guest",
        phone,
        role: "customer",
        passwordHash: await hashPassword(`guest-${email}-${Date.now()}`),
      },
    });
  } else if (name.trim() && !user.name) {
    user = await db.user.update({
      where: { id: user.id },
      data: { name: name.trim() },
    });
  }
  return user;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");

  if (conversationId) {
    const messages = await db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ messages });
  }

  // For customer: their conversations. For admin: all conversations.
  const where = user.role === "admin" ? {} : { userId: user.id };
  const conversations = await db.conversation.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { conversationId, text, guestName, guestEmail } = body as {
    conversationId?: string;
    text?: string;
    guestName?: string;
    guestEmail?: string;
  };
  if (!text) return NextResponse.json({ error: "Missing text" }, { status: 422 });

  let user = await getCurrentUser();
  let setCookieToken: string | null = null;

  // Guest start: create/find customer and issue session so chat continues
  if (!user && guestName && guestEmail) {
    const guest = await ensureGuestUser(guestName, guestEmail);
    user = {
      id: guest.id,
      email: guest.email,
      name: guest.name,
      phone: guest.phone,
      role: guest.role,
      city: guest.city,
      dietaryPrefs: guest.dietaryPrefs,
    };
    setCookieToken = await createSessionToken({
      userId: guest.id,
      email: guest.email,
      role: guest.role,
      name: guest.name || undefined,
    });
    await setSessionCookieStore(setCookieToken);
  }

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let convId = conversationId;
  if (!convId) {
    const conv = await db.conversation.create({
      data: { userId: user.id, status: "active" },
    });
    convId = conv.id;
  }

  const msg = await db.message.create({
    data: {
      conversationId: convId,
      senderType: user.role === "admin" ? "admin" : "user",
      senderId: user.id,
      text,
    },
  });

  // If customer sent message, generate an auto-reply (bot)
  if (user.role !== "admin") {
    const lower = text.toLowerCase();
    let reply = "Thanks for your message! Our team will respond shortly. For urgent enquiries, call 7545 800 800.";
    if (lower.includes("price") || lower.includes("cost") || lower.includes("rate")) {
      reply = "Our packages start at ₹699/guest (Rasa Aarambh) and go up to ₹1,499/guest (Rasa Rajsi). Each package can be customized with add-ons like live stations, regional thalis, mithai studio, and mansahari. Would you like a custom quotation?";
    } else if (lower.includes("book") || lower.includes("date")) {
      reply = "To book, pick a package, customize the menu, and pay a 25% advance. We serve Jamshedpur and the 200km radius. What date are you planning for?";
    } else if (lower.includes("veg") || lower.includes("jain")) {
      reply = "Yes! We have full veg-only and Jain-friendly options across all packages. Just toggle the dietary preference in the menu builder.";
    } else if (lower.includes("payment") || lower.includes("advance")) {
      reply = "We take 25% advance to lock the booking, balance due 48 hours before the event. UPI, cards, and net banking accepted via Razorpay. GST invoice provided.";
    }
    await db.message.create({
      data: {
        conversationId: convId,
        senderType: "bot",
        text: reply,
      },
    });
  }

  const res = NextResponse.json({ message: msg, conversationId: convId });
  if (setCookieToken) setSessionCookie(res, setCookieToken);
  return res;
}
