import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, isValidAuthCookieValue } from "@/lib/auth-cookie";
import { MAX_IMAGE_BYTES, deleteImage, listImages, saveImage } from "@/lib/image-store";

async function requireAuth() {
  const jar = await cookies();
  const ok = await isValidAuthCookieValue(jar.get(AUTH_COOKIE_NAME)?.value);
  return ok;
}

// GET /api/images -> every uploaded image, newest first.
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const images = await listImages();
  return NextResponse.json({ images });
}

// POST /api/images (multipart/form-data, field "file") -> uploads one image.
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "이미지 파일이 필요합니다." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 파일만 업로드할 수 있어요." }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: `이미지는 ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))}MB 이하만 업로드할 수 있어요.` },
      { status: 400 },
    );
  }

  const image = await saveImage(file);
  return NextResponse.json({ image }, { status: 201 });
}

// DELETE /api/images?id=<id> -> removes one uploaded image.
export async function DELETE(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  await deleteImage(id);
  return NextResponse.json({ ok: true });
}
