import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSiteSettings, stripeConfigured, stripeDemoMode } from "@/lib/payments";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getSiteSettings();
  const live = stripeConfigured();
  const demo = stripeDemoMode();
  return NextResponse.json({
    stripeConfigured: live || demo,
    stripeLive: live,
    stripeDemo: demo,
    paymentsEnabled: settings.paymentsEnabled,
    upiId: settings.upiId || null,
    upiQrUrl: settings.upiQrUrl || null,
  });
}
