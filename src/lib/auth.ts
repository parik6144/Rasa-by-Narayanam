// Auth helpers — simple HTTP-only cookie session
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  hasPermission,
  isStaffRole,
  type Permission,
} from "@/lib/permissions";

const SESSION_COOKIE = "rasa_session";
const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || "rasa-secret-change-in-prod-please-32bytes!");

/** Secure cookies break login on plain HTTP (e.g. EC2 IP). Set COOKIE_SECURE=true behind HTTPS. */
function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  name?: string;
}

export async function createSessionToken(user: SessionPayload): Promise<string> {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .setIssuedAt()
    .sign(SECRET);
}

export function setSessionCookie(response: NextResponse, token: string): void {
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: cookieSecure(),
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  };
  response.cookies.set(SESSION_COOKIE, token, opts);
}

export async function setSessionCookieStore(token: string): Promise<void> {
  try {
    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSecure(),
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  } catch {
    // Response Set-Cookie header is the fallback
  }
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    maxAge: 0,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      city: true,
      dietaryPrefs: true,
      isActive: true,
    },
  });
  if (!user || !user.isActive) return null;
  return user;
}

export async function requireUser() {
  const u = await getCurrentUser();
  if (!u) throw new Error("UNAUTHORIZED");
  return u;
}

/** True owner admin only (team management). */
export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "admin") throw new Error("FORBIDDEN");
  return u;
}

/** Any staff role that may use /admin. */
export async function requireStaff() {
  const u = await requireUser();
  if (!isStaffRole(u.role)) throw new Error("FORBIDDEN");
  return u;
}

export async function requirePermission(perm: Permission) {
  const u = await requireStaff();
  if (!hasPermission(u.role, perm)) throw new Error("FORBIDDEN");
  return u;
}
