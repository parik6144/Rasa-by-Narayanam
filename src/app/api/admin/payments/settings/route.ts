import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requirePermission } from "@/lib/auth";
import { authErrorResponse } from "@/lib/api-auth";
import { getSiteSettings } from "@/lib/payments";
import { db } from "@/lib/db";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function GET() {
  try {
    await requirePermission("payments.read");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }
  const settings = await getSiteSettings();
  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission("payments.manage");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }

  const contentType = req.headers.get("content-type") || "";
  let upiId: string | undefined;
  let paymentsEnabled: boolean | undefined;
  let upiQrUrl: string | undefined | null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    if (form.has("upiId")) upiId = String(form.get("upiId") || "").trim();
    if (form.has("paymentsEnabled")) {
      paymentsEnabled = String(form.get("paymentsEnabled")) !== "false";
    }
    const file = form.get("qr");
    if (file && typeof file === "object" && "arrayBuffer" in file) {
      const f = file as File;
      if (f.size > 0) {
        if (f.size > MAX_BYTES) {
          return NextResponse.json({ error: "QR image too large (max 5MB)" }, { status: 422 });
        }
        const mime = f.type || "image/png";
        if (!ALLOWED.has(mime)) {
          return NextResponse.json({ error: "QR must be an image" }, { status: 422 });
        }
        const dir = path.join(process.cwd(), "public", "uploads", "payments");
        await mkdir(dir, { recursive: true });
        const fname = `upi-qr-${Date.now()}-${safeName(f.name || "qr.png")}`;
        await writeFile(path.join(dir, fname), Buffer.from(await f.arrayBuffer()));
        upiQrUrl = `/uploads/payments/${fname}`;
      }
    }
    if (form.get("clearQr") === "1") upiQrUrl = null;
  } else {
    const body = await req.json();
    if (body.upiId !== undefined) upiId = String(body.upiId || "").trim();
    if (body.paymentsEnabled !== undefined) paymentsEnabled = Boolean(body.paymentsEnabled);
    if (body.upiQrUrl !== undefined) upiQrUrl = body.upiQrUrl ? String(body.upiQrUrl) : null;
  }

  const settings = await db.siteSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      upiId: upiId || null,
      upiQrUrl: upiQrUrl ?? null,
      paymentsEnabled: paymentsEnabled ?? true,
    },
    update: {
      ...(upiId !== undefined ? { upiId: upiId || null } : {}),
      ...(upiQrUrl !== undefined ? { upiQrUrl } : {}),
      ...(paymentsEnabled !== undefined ? { paymentsEnabled } : {}),
    },
  });

  return NextResponse.json({ settings });
}
