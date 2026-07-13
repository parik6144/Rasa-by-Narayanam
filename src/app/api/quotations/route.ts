// Quotation: list (GET) + create (POST)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const quotations = await db.quotation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { package: true },
  });
  return NextResponse.json({ quotations });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { packageId, guests, menu, addons, total } = body as {
    packageId?: string; guests?: number; menu?: unknown; addons?: unknown; total?: number;
  };
  // find package slug → db id
  let dbPkgId: string | null = null;
  if (packageId) {
    const pkg = await db.package.findUnique({ where: { slug: packageId } });
    if (pkg) dbPkgId = pkg.id;
  }
  const q = await db.quotation.create({
    data: {
      userId: user.id,
      packageId: dbPkgId,
      guests: guests || 100,
      menu: JSON.stringify(menu || {}),
      addons: JSON.stringify(addons || {}),
      total: (total || 0) * 100, // paise
      status: "draft",
    },
  });
  return NextResponse.json({ quotation: q });
}
