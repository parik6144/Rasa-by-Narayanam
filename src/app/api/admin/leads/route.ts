// Admin: list + update leads (status, follow-ups, notes, schedule, files)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { authErrorResponse } from "@/lib/api-auth";

export type LeadFile = {
  name: string;
  url: string;
  size: number;
  mime: string;
  at: string;
};

export type FollowUpEntry = {
  at: string;
  type: string; // call | whatsapp | note | email | visit | schedule | status | update
  note: string;
  by?: string;
  nextAt?: string | null;
  files?: LeadFile[];
};

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function GET() {
  try {
    await requirePermission("leads.write");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }
  const leads = await db.lead.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 300,
  });
  return NextResponse.json({ leads });
}

export async function PATCH(req: Request) {
  let admin;
  try {
    admin = await requirePermission("leads.write");
  } catch (e) {
    const { status, body } = authErrorResponse(e);
    return NextResponse.json(body, { status });
  }

  const body = await req.json();
  const {
    id,
    status,
    priority,
    notes,
    lostReason,
    followUpAt,
    clearFollowUp,
    followUp,
  } = body as {
    id?: string;
    status?: string;
    priority?: string;
    notes?: string;
    lostReason?: string | null;
    followUpAt?: string | null;
    clearFollowUp?: boolean;
    followUp?: {
      type: string;
      note: string;
      nextAt?: string | null;
      files?: LeadFile[];
    };
  };

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 422 });

  const existing = await db.lead.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  let timeline = parseJson<FollowUpEntry[]>(existing.followUps, []);
  let allFiles = parseJson<LeadFile[]>(existing.attachments, []);

  if (status) data.status = status;
  if (priority) data.priority = priority;
  if (notes !== undefined) data.notes = notes;
  if (lostReason !== undefined) data.lostReason = lostReason;

  // Next follow-up datetime — always persist when provided
  if (clearFollowUp) {
    data.followUpAt = null;
  } else if (followUpAt !== undefined) {
    data.followUpAt = followUpAt ? new Date(followUpAt) : null;
  } else if (followUp?.nextAt) {
    data.followUpAt = new Date(followUp.nextAt);
  }

  if (followUp?.type) {
    const nextAt = followUp.nextAt || followUpAt || null;
    const files = Array.isArray(followUp.files) ? followUp.files : [];
    const entry: FollowUpEntry = {
      at: new Date().toISOString(),
      type: followUp.type,
      note: followUp.note || "",
      by: admin.name || admin.email,
      nextAt: nextAt || null,
      files: files.length ? files : undefined,
    };
    timeline = [entry, ...timeline].slice(0, 80);
    data.followUps = JSON.stringify(timeline);
    data.lastContactedAt = new Date();

    if (files.length) {
      allFiles = [...files, ...allFiles].slice(0, 100);
      data.attachments = JSON.stringify(allFiles);
    }

    // Keep latest discussion summary in notes for quick glance
    if (followUp.note?.trim()) {
      const stamp = new Date().toLocaleString("en-IN", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      });
      const nextBit = nextAt
        ? `\n⏭ Next: ${new Date(nextAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
        : "";
      const block = `[${stamp} · ${followUp.type}] ${followUp.note.trim()}${nextBit}`;
      data.notes = existing.notes ? `${block}\n—\n${existing.notes}` : block;
    }

    if (nextAt && !status) {
      if (["new", "contacted"].includes(existing.status)) data.status = "follow_up";
    }

    if (["call", "whatsapp", "email", "visit", "update"].includes(followUp.type)) {
      if (!status && existing.status === "new") data.status = "contacted";
      if (!status && data.status !== "follow_up" && nextAt) data.status = "follow_up";
    }
  }

  if (status === "lost" && lostReason) {
    timeline = [
      {
        at: new Date().toISOString(),
        type: "status",
        note: `Lost: ${lostReason}`,
        by: admin.name || admin.email,
      },
      ...timeline,
    ].slice(0, 80);
    data.followUps = JSON.stringify(timeline);
  } else if (status && status !== existing.status && !followUp?.type) {
    timeline = [
      {
        at: new Date().toISOString(),
        type: "status",
        note: `Status → ${status}`,
        by: admin.name || admin.email,
      },
      ...timeline,
    ].slice(0, 80);
    data.followUps = JSON.stringify(timeline);
  }

  // If only scheduling without followUp payload
  if (!followUp?.type && followUpAt && !clearFollowUp) {
    timeline = [
      {
        at: new Date().toISOString(),
        type: "schedule",
        note: `Next follow-up set for ${new Date(followUpAt).toLocaleString("en-IN")}`,
        by: admin.name || admin.email,
        nextAt: followUpAt,
      },
      ...timeline,
    ].slice(0, 80);
    data.followUps = JSON.stringify(timeline);
    if (!status && existing.status === "new") data.status = "follow_up";
  }

  const lead = await db.lead.update({ where: { id }, data });

  if (followUp || status) {
    const related = await db.notification.findMany({
      where: { userId: admin.id, type: "lead_new", readAt: null },
      take: 50,
    });
    const toRead = related.filter((n) => {
      try {
        const meta = n.meta ? JSON.parse(n.meta) : {};
        return meta.leadId === id;
      } catch {
        return false;
      }
    });
    if (toRead.length) {
      await db.notification.updateMany({
        where: { id: { in: toRead.map((n) => n.id) } },
        data: { readAt: new Date() },
      });
    }
  }

  return NextResponse.json({ lead });
}
