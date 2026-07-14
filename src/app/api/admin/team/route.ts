// Admin-only: list / create / update / deactivate staff accounts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, requirePermission } from "@/lib/auth";
import { isStaffRole, type StaffRole } from "@/lib/permissions";
import { authErrorResponse } from "@/lib/api-auth";

const STAFF_WHERE = {
  role: { in: ["admin", "manager", "sales"] as StaffRole[] },
};

export async function GET() {
  try {
    await requirePermission("team.manage");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }

  const team = await db.user.findMany({
    where: STAFF_WHERE,
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      city: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ team });
}

export async function POST(req: Request) {
  try {
    await requirePermission("team.manage");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = body.phone ? String(body.phone).trim() : null;
  const password = String(body.password || "");
  const role = String(body.role || "") as StaffRole;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password required" }, { status: 422 });
  }
  if (!isStaffRole(role)) {
    return NextResponse.json({ error: "Role must be admin, manager, or sales" }, { status: 422 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 422 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      passwordHash,
      role,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ user }, { status: 201 });
}

export async function PATCH(req: Request) {
  let actor;
  try {
    actor = await requirePermission("team.manage");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }

  const body = await req.json();
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 422 });

  const target = await db.user.findUnique({ where: { id } });
  if (!target || !isStaffRole(target.role)) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  const data: {
    name?: string;
    phone?: string | null;
    role?: string;
    isActive?: boolean;
    passwordHash?: string;
  } = {};

  if (body.name !== undefined) data.name = String(body.name).trim() || target.name || "";
  if (body.phone !== undefined) data.phone = body.phone ? String(body.phone).trim() : null;
  if (body.role !== undefined) {
    const role = String(body.role) as StaffRole;
    if (!isStaffRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 422 });
    }
    if (target.id === actor.id && role !== "admin") {
      return NextResponse.json({ error: "Cannot demote your own admin account" }, { status: 403 });
    }
    data.role = role;
  }
  if (body.isActive !== undefined) {
    if (target.id === actor.id && body.isActive === false) {
      return NextResponse.json({ error: "Cannot deactivate yourself" }, { status: 403 });
    }
    data.isActive = Boolean(body.isActive);
  }
  if (body.password) {
    const password = String(body.password);
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 422 });
    }
    data.passwordHash = await hashPassword(password);
  }

  const user = await db.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ user });
}

export async function DELETE(req: Request) {
  let actor;
  try {
    actor = await requirePermission("team.manage");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 422 });
  if (id === actor.id) {
    return NextResponse.json({ error: "Cannot deactivate yourself" }, { status: 403 });
  }

  const target = await db.user.findUnique({ where: { id } });
  if (!target || !isStaffRole(target.role)) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  const user = await db.user.update({
    where: { id },
    data: { isActive: false },
    select: { id: true, email: true, isActive: true, role: true },
  });
  return NextResponse.json({ user });
}
