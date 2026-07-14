// Admin notifications — list, unread count, mark read
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { authErrorResponse } from "@/lib/api-auth";

export async function GET(req: Request) {
  let admin;
  try {
    admin = await requirePermission("notifications.read");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "1";
  const limit = Math.min(parseInt(searchParams.get("limit") || "40", 10), 100);

  const where = {
    userId: admin.id,
    ...(unreadOnly ? { readAt: null } : {}),
  };

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    db.notification.count({ where: { userId: admin.id, readAt: null } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(req: Request) {
  let admin;
  try {
    admin = await requirePermission("notifications.read");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }

  const body = await req.json();
  const { id, markAll } = body as { id?: string; markAll?: boolean };

  if (markAll) {
    await db.notification.updateMany({
      where: { userId: admin.id, readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 422 });

  const n = await db.notification.findFirst({ where: { id, userId: admin.id } });
  if (!n) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ notification: updated });
}
