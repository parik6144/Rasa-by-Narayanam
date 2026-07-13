// Admin: dashboard stats
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last30 = new Date(); last30.setDate(last30.getDate() - 30);

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

  return NextResponse.json({
    kpis: {
      totalBookings,
      todayBookings,
      totalCustomers,
      totalRevenue: totalRevenue._sum.amount || 0,
      pendingPayments,
      activeEvents,
    },
    recentBookings,
    recentCustomers,
  });
}
