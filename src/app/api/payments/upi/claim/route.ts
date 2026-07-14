import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  getSiteSettings,
  notifyAdminsOfPaymentClaim,
  remainingBalancePaise,
} from "@/lib/payments";
import { isStaffRole } from "@/lib/permissions";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getSiteSettings();
  if (!settings.paymentsEnabled) {
    return NextResponse.json({ error: "Payments are temporarily disabled" }, { status: 503 });
  }
  if (!settings.upiId && !settings.upiQrUrl) {
    return NextResponse.json(
      { error: "UPI QR is not set up yet. Ask admin to upload a QR, or pay with Stripe." },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const bookingId = String(form.get("bookingId") || "");
  const amountRupees = Number(form.get("amountRupees"));
  const note = String(form.get("note") || "").trim().slice(0, 500);
  const file = form.get("proof");

  if (!bookingId || !Number.isFinite(amountRupees) || amountRupees < 1) {
    return NextResponse.json({ error: "bookingId and amountRupees required" }, { status: 422 });
  }

  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.userId !== user.id && !isStaffRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const remaining = remainingBalancePaise(booking);
  if (booking.balance !== remaining) {
    await db.booking.update({
      where: { id: booking.id },
      data: { balance: remaining },
    });
  }
  const amountPaise = Math.min(Math.round(amountRupees * 100), remaining);
  if (amountPaise < 100) {
    return NextResponse.json(
      {
        error:
          remaining <= 0
            ? "This booking is already fully paid (nothing left on the balance)."
            : "Amount too small — pay at least ₹1.",
        remainingRupees: Math.round(remaining / 100),
      },
      { status: 422 }
    );
  }

  const pendingExists = await db.payment.findFirst({
    where: { bookingId, status: "pending", gateway: "upi_manual" },
  });
  if (pendingExists) {
    return NextResponse.json(
      { error: "You already have a pending UPI claim on this booking. Wait for admin approval." },
      { status: 409 }
    );
  }

  let proofUrl: string | null = null;
  if (file && typeof file === "object" && "arrayBuffer" in file) {
    const f = file as File;
    if (f.size > 0) {
      if (f.size > MAX_BYTES) {
        return NextResponse.json({ error: "Proof file too large (max 8MB)" }, { status: 422 });
      }
      const mime = f.type || "application/octet-stream";
      if (!ALLOWED.has(mime)) {
        return NextResponse.json({ error: "Proof must be image or PDF" }, { status: 422 });
      }
      const dir = path.join(process.cwd(), "public", "uploads", "payments");
      await mkdir(dir, { recursive: true });
      const fname = `${Date.now()}-${safeName(f.name || "proof.jpg")}`;
      const buf = Buffer.from(await f.arrayBuffer());
      await writeFile(path.join(dir, fname), buf);
      proofUrl = `/uploads/payments/${fname}`;
    }
  }

  const payment = await db.payment.create({
    data: {
      bookingId: booking.id,
      userId: booking.userId,
      amount: amountPaise,
      method: "upi",
      status: "pending",
      gateway: "upi_manual",
      proofUrl,
      note: note || null,
    },
  });

  await notifyAdminsOfPaymentClaim({
    bookingRef: booking.bookingRef,
    amountPaise,
    paymentId: payment.id,
    customerName: user.name || user.email,
  }).catch(() => {});

  return NextResponse.json({ payment }, { status: 201 });
}
