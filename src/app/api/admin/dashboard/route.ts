// Admin: dashboard stats
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { authErrorResponse } from "@/lib/api-auth";

export async function GET() {
  let user;
  try {
    user = await requireStaff();
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalBookings, todayBookings, totalCustomers, totalRevenue, pendingPayments, activeEvents, recentBookings, recentCustomers] = await Promise.all([
    db.booking.count(),
    db.booking.count({ where: { createdAt: { gte: today } } }),
    db.user.count({ where: { role: "customer" } }),
    db.payment.aggregate({ _sum: { amount: true } }),
    db.booking.count({ where: { balance: { gt: 0 } } }),
    db.booking.count({ where: { eventDate: { gte: today }, status: "confirmed" } }),
    db.booking.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { user: true, package: true } }),
    db.user.findMany({ take: 8, where: { role: "customer" }, orderBy: { createdAt: "desc" } }),
  ]);

  const showFinance = hasPermission(user.role, "overview.finance");

  return NextResponse.json({
    kpis: {
      totalBookings,
      todayBookings,
      totalCustomers,
      totalRevenue: showFinance ? (totalRevenue._sum.amount || 0) : null,
      pendingPayments: showFinance ? pendingPayments : null,
      activeEvents,
    },
    recentBookings,
    recentCustomers,
  });
}
