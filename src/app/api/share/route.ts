// Public share view — fetch quotation by token
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 422 });

  const share = await db.quotationShare.findUnique({ where: { token } });
  if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (share.expiresAt < new Date()) return NextResponse.json({ error: "Link expired" }, { status: 410 });

  // Mark viewed
  if (!share.viewedAt) {
    await db.quotationShare.update({ where: { id: share.id }, data: { viewedAt: new Date() } });
  }

  return NextResponse.json({
    menu: JSON.parse(share.menuJson),
    addons: JSON.parse(share.addonsJson || "[]"),
    guests: share.guests,
    total: share.total / 100, // paise → rupees
    createdAt: share.createdAt,
    expiresAt: share.expiresAt,
  });
}
