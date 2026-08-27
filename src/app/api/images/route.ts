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

  try {
    const images = await listImages();
    return NextResponse.json({ images });
  } catch (err) {
    console.error("이미지 목록 조회 실패:", err);
    const hint = process.env.BLOB_READ_WRITE_TOKEN
      ? "이미지 목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요."
      : "이미지 저장소가 연결되어 있지 않아요. Vercel 프로젝트의 Storage 탭에서 Blob을 연결한 뒤 다시 시도해주세요.";
    return NextResponse.json({ error: hint }, { status: 500 });
  }
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

  let image;
  try {
    image = await saveImage(file);
  } catch (err) {
    // On Vercel, the local-file fallback tries to write to the serverless
    // function's read-only filesystem and throws — almost always because
    // Blob storage was never connected (Storage 탭 → Create Database →
    // Blob → Connect to Project). Same failure mode the todos list hit
    // before Redis was connected.
    console.error("이미지 저장 실패:", err);
    const hint = process.env.BLOB_READ_WRITE_TOKEN
      ? "이미지 저장에 실패했어요. 잠시 후 다시 시도해주세요."
      : "이미지 저장소가 연결되어 있지 않아요. Vercel 프로젝트의 Storage 탭에서 Blob을 연결한 뒤 다시 시도해주세요.";
    return NextResponse.json({ error: hint }, { status: 500 });
  }
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
