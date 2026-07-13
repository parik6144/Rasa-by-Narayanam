// Auth: register
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSessionToken, setSessionCookie, setSessionCookieStore } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, phone, city } = body as {
      name?: string; email?: string; password?: string; phone?: string; city?: string;
    };
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 422 });
    }
    const phoneDigits = String(phone || "").replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      return NextResponse.json({ error: "Valid phone number is required (min 10 digits)" }, { status: 422 });
    }
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    const hash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        email,
        name: name || null,
        phone: phoneDigits,
        city: city || null,
        passwordHash: hash,
        role: "customer",
      },
    });
    const token = await createSessionToken({ userId: user.id, email: user.email, role: user.role, name: user.name || undefined });
    await setSessionCookieStore(token);
    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role, city: user.city },
    });
    setSessionCookie(res, token);
    return res;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
