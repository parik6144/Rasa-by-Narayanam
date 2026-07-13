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

function botReplyFor(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("price") || lower.includes("cost") || lower.includes("rate")) {
    return "Our packages start at ₹699/guest (Rasa Aarambh) and go up to ₹1,499/guest (Rasa Rajsi). Each package can be customized with add-ons like live stations, regional thalis, mithai studio, and mansahari. Would you like a custom quotation?";
  }
  if (lower.includes("book") || lower.includes("date")) {
    return "To book, pick a package, customize the menu, and pay a 25% advance. We serve Jamshedpur and the 200km radius. What date are you planning for?";
  }
  if (lower.includes("veg") || lower.includes("jain")) {
    return "Yes! We have full veg-only and Jain-friendly options across all packages. Just toggle the dietary preference in the menu builder.";
  }
  if (lower.includes("payment") || lower.includes("advance")) {
    return "We take 25% advance to lock the booking, balance due 48 hours before the event. UPI, cards, and net banking accepted via Razorpay. GST invoice provided.";
  }
  if (text.includes("[Image]") || text.includes("[File]")) {
    return "Got your file — thank you! Our team will review it shortly. For urgent help, call 7545 800 800.";
  }
  return "Thanks for your message! Our team will respond shortly. For urgent enquiries, call 7545 800 800.";
}

async function peerTypingFromDb(conversationId: string, myRole: string) {
  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { typingBy: true, typingUntil: true, status: true, closedAt: true },
  });
  if (!conv) return { typing: null as null, status: "active", closedAt: null as Date | null };
  const until = conv.typingUntil ? new Date(conv.typingUntil).getTime() : 0;
  const active = conv.typingBy && until > Date.now() && conv.typingBy !== myRole;
  return {
    typing: active ? { senderType: conv.typingBy as string } : null,
    status: conv.status,
    closedAt: conv.closedAt,
  };
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
    const myType = user.role === "admin" ? "admin" : "user";
    const meta = await peerTypingFromDb(conversationId, myType);
    return NextResponse.json({
      messages,
      typing: meta.typing,
      status: meta.status,
      closedAt: meta.closedAt,
    });
  }

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
  const { conversationId, text, guestName, guestEmail, attachmentUrl } = body as {
    conversationId?: string;
    text?: string;
    guestName?: string;
    guestEmail?: string;
    attachmentUrl?: string;
  };

  const trimmed = (text || "").trim();
  if (!trimmed && !attachmentUrl) {
    return NextResponse.json({ error: "Missing text or attachment" }, { status: 422 });
  }

  let user = await getCurrentUser();
  let setCookieToken: string | null = null;

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
  } else {
    const existing = await db.conversation.findUnique({ where: { id: convId } });
    if (existing?.status === "closed") {
      return NextResponse.json({ error: "This chat session has ended." }, { status: 423 });
    }
  }

  const senderType = user.role === "admin" ? "admin" : "user";

  // Clear own typing flag in DB
  await db.conversation.update({
    where: { id: convId },
    data: { typingBy: null, typingUntil: null },
  }).catch(() => {});

  const messageText =
    trimmed ||
    (attachmentUrl
      ? attachmentUrl.match(/\.(png|jpe?g|gif|webp)$/i)
        ? "[Image]"
        : "[File]"
      : "");

  const msg = await db.message.create({
    data: {
      conversationId: convId,
      senderType,
      senderId: user.id,
      text: messageText,
      attachmentUrl: attachmentUrl || null,
    },
  });

  // Customer message → bot typing in DB, then delayed auto-reply
  if (user.role !== "admin") {
    await db.conversation.update({
      where: { id: convId },
      data: {
        typingBy: "bot",
        typingUntil: new Date(Date.now() + 4000),
      },
    });
    const reply = botReplyFor(messageText);
    const delay = 1200 + Math.floor(Math.random() * 900);
    const id = convId;
    setTimeout(async () => {
      try {
        await db.message.create({
          data: {
            conversationId: id,
            senderType: "bot",
            text: reply,
          },
        });
      } catch {
        /* ignore */
      } finally {
        try {
          await db.conversation.update({
            where: { id },
            data: { typingBy: null, typingUntil: null },
          });
        } catch {
          /* ignore */
        }
      }
    }, delay);
  }

  const res = NextResponse.json({
    message: msg,
    conversationId: convId,
    botPending: user.role !== "admin",
  });
  if (setCookieToken) setSessionCookie(res, setCookieToken);
  return res;
}
