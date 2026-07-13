// Chat: list conversations + messages
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { conversationId, text } = body as { conversationId?: string; text?: string };
  if (!text) return NextResponse.json({ error: "Missing text" }, { status: 422 });

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

  return NextResponse.json({ message: msg, conversationId: convId });
}
