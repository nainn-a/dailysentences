import { readFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, isValidAuthCookieValue } from "@/lib/auth-cookie";

// Serves images saved by the local-disk fallback in image-store.ts (used
// when BLOB_READ_WRITE_TOKEN isn't set). Vercel Blob images skip this route
// entirely — their DTO url already points straight at the CDN.
const DATA_DIR = path.join(process.cwd(), "data", "images");

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const jar = await cookies();
  if (!(await isValidAuthCookieValue(jar.get(AUTH_COOKIE_NAME)?.value))) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { filename } = await params;
  // path.basename strips any directory traversal (e.g. "../../etc/passwd").
  const safeName = path.basename(filename);

  try {
    const buffer = await readFile(path.join(DATA_DIR, safeName));
    const ext = safeName.split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": MIME_TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "이미지를 찾을 수 없습니다." }, { status: 404 });
  }
}
