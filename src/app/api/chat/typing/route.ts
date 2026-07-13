import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const TYPING_TTL_MS = 5000;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversationId = new URL(req.url).searchParams.get("conversationId");
  if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 422 });

  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { typingBy: true, typingUntil: true, status: true, closedAt: true },
  });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const myRole = user.role === "admin" ? "admin" : "user";
  const now = Date.now();
  const until = conv.typingUntil ? new Date(conv.typingUntil).getTime() : 0;
  const active = conv.typingBy && until > now && conv.typingBy !== myRole;

  return NextResponse.json({
    typing: active ? { senderType: conv.typingBy } : null,
    status: conv.status,
    closedAt: conv.closedAt,
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { conversationId, typing, action } = body as {
    conversationId?: string;
    typing?: boolean;
    action?: "close" | "reopen";
  };
  if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 422 });

  // End / reopen session
  if (action === "close" || action === "reopen") {
    if (user.role !== "admin" && action === "reopen") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Admin can close; customer can also close their own chat
    const conv = await db.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (user.role !== "admin" && conv.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await db.conversation.update({
      where: { id: conversationId },
      data:
        action === "close"
          ? { status: "closed", closedAt: new Date(), typingBy: null, typingUntil: null }
          : { status: "active", closedAt: null },
    });
    return NextResponse.json({
      ok: true,
      status: updated.status,
      closedAt: updated.closedAt,
    });
  }

  const senderType = user.role === "admin" ? "admin" : "user";
  const conv = await db.conversation.findUnique({ where: { id: conversationId } });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conv.status === "closed") {
    return NextResponse.json({ ok: true, typing: null, status: "closed", closedAt: conv.closedAt });
  }

  if (typing) {
    await db.conversation.update({
      where: { id: conversationId },
      data: {
        typingBy: senderType,
        typingUntil: new Date(Date.now() + TYPING_TTL_MS),
      },
    });
  } else {
    // Only clear if we own the typing flag
    if (conv.typingBy === senderType) {
      await db.conversation.update({
        where: { id: conversationId },
        data: { typingBy: null, typingUntil: null },
      });
    }
  }

  const fresh = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { typingBy: true, typingUntil: true },
  });
  const myRole = senderType;
  const until = fresh?.typingUntil ? new Date(fresh.typingUntil).getTime() : 0;
  const active = fresh?.typingBy && until > Date.now() && fresh.typingBy !== myRole;

  return NextResponse.json({
    ok: true,
    typing: active ? { senderType: fresh!.typingBy } : null,
  });
}
