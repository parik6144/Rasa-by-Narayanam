/**
 * Seed payment settings (dummy UPI QR) + sample orders with linked payments.
 * Usage: node scripts/seed-payments-demo.js
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const db = new PrismaClient();
const QR = "/uploads/payments/dummy-upi-qr.png";
const PROOF = "/uploads/payments/proof-demo-upi.png";

async function upsertCustomer(email, name, phone) {
  let u = await db.user.findUnique({ where: { email } });
  if (!u) {
    u = await db.user.create({
      data: {
        email,
        name,
        phone,
        city: "Jamshedpur",
        role: "customer",
        passwordHash: await bcrypt.hash("demo123", 10),
        isActive: true,
      },
    });
  }
  return u;
}

async function replaceBooking(ref, userId, data, payments) {
  const existing = await db.booking.findUnique({ where: { bookingRef: ref } });
  if (existing) {
    await db.payment.deleteMany({ where: { bookingId: existing.id } });
    await db.booking.delete({ where: { id: existing.id } });
  }
  const booking = await db.booking.create({
    data: {
      bookingRef: ref,
      userId,
      ...data,
    },
  });
  for (const p of payments) {
    await db.payment.create({
      data: {
        bookingId: booking.id,
        userId,
        ...p,
      },
    });
  }
  return booking;
}

async function main() {
  await db.siteSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      upiId: "rasa@paytm",
      upiQrUrl: QR,
      paymentsEnabled: true,
    },
    update: {
      upiId: "rasa@paytm",
      upiQrUrl: QR,
      paymentsEnabled: true,
    },
  });

  const sharma = await upsertCustomer("sharma.party@demo.rasa", "Sharma Family", "9876501001");
  const mehta = await upsertCustomer("mehta.corp@demo.rasa", "Mehta Corp", "9876501002");
  const payer = await upsertCustomer("payer@test.local", "Test Payer", "9999900001");

  // Party 1: wedding — advance via UPI + partial Stripe, balance left
  const total1 = 42000000; // ₹4,20,000
  const paid1a = 10500000; // 25% UPI
  const paid1b = 5000000; // Stripe top-up
  await replaceBooking(
    "RASA-DEMO-SHARMA",
    sharma.id,
    {
      eventDate: new Date("2026-11-15"),
      venue: "Hotel Alcor, Bistupur",
      city: "Jamshedpur",
      guests: 350,
      status: "confirmed",
      occasion: "Wedding",
      subtotal: Math.round(total1 / 1.05),
      gst: total1 - Math.round(total1 / 1.05),
      total: total1,
      advancePaid: paid1a + paid1b,
      balance: total1 - paid1a - paid1b,
      notes: "Demo order — Sharma wedding",
    },
    [
      {
        amount: paid1a,
        method: "upi",
        status: "success",
        gateway: "upi_manual",
        note: "UTR DEMOUPI001 — advance 25%",
        proofUrl: PROOF,
        confirmedBy: "seed",
        confirmedAt: new Date("2026-07-01T10:00:00Z"),
        createdAt: new Date("2026-07-01T09:30:00Z"),
      },
      {
        amount: paid1b,
        method: "card",
        status: "success",
        gateway: "stripe",
        gatewayTxn: "cs_demo_sharma_partial",
        note: "Stripe Checkout — partial balance",
        confirmedAt: new Date("2026-07-10T14:00:00Z"),
        createdAt: new Date("2026-07-10T13:55:00Z"),
      },
      {
        amount: 2000000,
        method: "upi",
        status: "pending",
        gateway: "upi_manual",
        note: "UTR DEMOUPI002 — awaiting approval",
        proofUrl: PROOF,
        createdAt: new Date(),
      },
    ]
  );

  // Party 2: corporate — fully paid via Stripe
  const total2 = 18500000;
  await replaceBooking(
    "RASA-DEMO-MEHTA",
    mehta.id,
    {
      eventDate: new Date("2026-09-20"),
      venue: "XLRI Campus",
      city: "Jamshedpur",
      guests: 180,
      status: "confirmed",
      occasion: "Corporate event",
      subtotal: Math.round(total2 / 1.05),
      gst: total2 - Math.round(total2 / 1.05),
      total: total2,
      advancePaid: total2,
      balance: 0,
      notes: "Demo order — Mehta Corp fully paid",
    },
    [
      {
        amount: Math.round(total2 * 0.25),
        method: "card",
        status: "success",
        gateway: "stripe",
        gatewayTxn: "cs_demo_mehta_adv",
        note: "Advance via Stripe",
        confirmedAt: new Date("2026-06-15T11:00:00Z"),
        createdAt: new Date("2026-06-15T10:50:00Z"),
      },
      {
        amount: total2 - Math.round(total2 * 0.25),
        method: "card",
        status: "success",
        gateway: "stripe",
        gatewayTxn: "cs_demo_mehta_bal",
        note: "Final balance via Stripe",
        confirmedAt: new Date("2026-08-01T16:00:00Z"),
        createdAt: new Date("2026-08-01T15:50:00Z"),
      },
    ]
  );

  // Update PAYTEST to have clearer linked history if present
  const paytest = await db.booking.findUnique({ where: { bookingRef: "RASA-PAYTEST" } });
  if (paytest) {
    const successSum = await db.payment.aggregate({
      where: { bookingId: paytest.id, status: "success" },
      _sum: { amount: true },
    });
    const paid = successSum._sum.amount || 0;
    await db.booking.update({
      where: { id: paytest.id },
      data: { advancePaid: paid, balance: Math.max(0, paytest.total - paid) },
    });
  } else {
    await replaceBooking(
      "RASA-PAYTEST",
      payer.id,
      {
        eventDate: new Date("2026-12-01"),
        venue: "Test Hall",
        city: "Jamshedpur",
        guests: 100,
        status: "confirmed",
        occasion: "Birthday",
        subtotal: 10000000,
        gst: 500000,
        total: 10500000,
        advancePaid: 250000,
        balance: 10250000,
      },
      [
        {
          amount: 250000,
          method: "upi",
          status: "success",
          gateway: "upi_manual",
          note: "UTR123 demo claim",
          confirmedBy: "seed",
          confirmedAt: new Date(),
        },
      ]
    );
  }

  console.log("OK — SiteSettings QR:", QR);
  console.log("Demo logins: sharma.party@demo.rasa / demo123 · mehta.corp@demo.rasa / demo123");
  console.log("Orders: RASA-DEMO-SHARMA (mixed UPI+Stripe+pending), RASA-DEMO-MEHTA (fully Stripe)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
