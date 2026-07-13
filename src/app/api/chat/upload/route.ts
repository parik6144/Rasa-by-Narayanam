import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/auth";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const conversationId = String(form.get("conversationId") || "").trim();
    const file = form.get("file");

    if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 422 });
    if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 422 });
    if (file.size <= 0) return NextResponse.json({ error: "Empty file" }, { status: 422 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 422 });

    const mime = file.type || "application/octet-stream";
    const allowed =
      mime.startsWith("image/") ||
      mime === "application/pdf" ||
      mime === "text/plain";
    if (!allowed) {
      return NextResponse.json({ error: "Only images, PDF, or text files are allowed." }, { status: 422 });
    }

    const dir = path.join(process.cwd(), "public", "uploads", "chat", conversationId);
    await mkdir(dir, { recursive: true });

    const stamp = Date.now();
    const base = safeName(file.name || `file-${stamp}`);
    const filename = `${stamp}-${base}`;
    const abs = path.join(dir, filename);
    await writeFile(abs, Buffer.from(await file.arrayBuffer()));

    const url = `/uploads/chat/${conversationId}/${filename}`;
    return NextResponse.json({
      file: { name: file.name || base, url, size: file.size, mime },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
