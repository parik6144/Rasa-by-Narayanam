// Admin: upload file attachment for a lead follow-up
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireAdmin } from "@/lib/auth";

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const ALLOWED = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const leadId = String(form.get("leadId") || "");
    const file = form.get("file");

    if (!leadId) return NextResponse.json({ error: "Missing leadId" }, { status: 422 });
    if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 422 });
    if (file.size <= 0) return NextResponse.json({ error: "Empty file" }, { status: 422 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 12MB)" }, { status: 422 });

    const mime = file.type || "application/octet-stream";
    if (!ALLOWED.has(mime) && !mime.startsWith("image/")) {
      return NextResponse.json({ error: "File type not allowed. Use PDF, image, Word, Excel, or text." }, { status: 422 });
    }

    const dir = path.join(process.cwd(), "public", "uploads", "leads", leadId);
    await mkdir(dir, { recursive: true });

    const stamp = Date.now();
    const base = safeName(file.name || `file-${stamp}`);
    const filename = `${stamp}-${base}`;
    const abs = path.join(dir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(abs, buffer);

    const url = `/uploads/leads/${leadId}/${filename}`;
    return NextResponse.json({
      file: {
        name: file.name || base,
        url,
        size: file.size,
        mime,
        at: new Date().toISOString(),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
