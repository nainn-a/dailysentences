import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, isValidAuthCookieValue } from "@/lib/auth-cookie";
import { MAX_DIARY_LENGTH, diaryDatesBetween, getDiary, saveDiary } from "@/lib/diary-store";
import type { DiaryImage } from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function requireAuth() {
  const jar = await cookies();
  const ok = await isValidAuthCookieValue(jar.get(AUTH_COOKIE_NAME)?.value);
  return ok;
}

function parseImages(input: unknown): DiaryImage[] | null {
  if (!Array.isArray(input)) return null;
  const images: DiaryImage[] = [];
  for (const item of input) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as DiaryImage).id === "string" &&
      typeof (item as DiaryImage).url === "string"
    ) {
      images.push({ id: (item as DiaryImage).id, url: (item as DiaryImage).url });
    } else {
      return null;
    }
  }
  return images;
}

// GET /api/diary?date=YYYY-MM-DD          -> that day's journal entry, or null.
// GET /api/diary?start=YYYY-MM-DD&end=...  -> { dates: ["YYYY-MM-DD", ...] }
//     the dates in range that have a non-empty entry — used to paint the
//     "일기 작성함" dot on the month calendar.
export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (start && end) {
    if (!DATE_RE.test(start) || !DATE_RE.test(end)) {
      return NextResponse.json({ error: "start/end 형식이 올바르지 않습니다." }, { status: 400 });
    }
    const dates = await diaryDatesBetween(start, end);
    return NextResponse.json({ dates });
  }

  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "date 또는 start/end 쿼리 파라미터가 필요합니다." }, { status: 400 });
  }

  const entry = await getDiary(date);
  return NextResponse.json({ entry });
}

// PUT /api/diary { date, content, images } -> upserts that day's journal entry.
export async function PUT(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const date = typeof body?.date === "string" ? body.date : "";
  const content = typeof body?.content === "string" ? body.content : "";
  const images = parseImages(body?.images);

  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "date 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (content.length > MAX_DIARY_LENGTH) {
    return NextResponse.json(
      { error: `일기는 ${MAX_DIARY_LENGTH.toLocaleString()}자 이내로 작성해주세요.` },
      { status: 400 },
    );
  }
  if (images === null) {
    return NextResponse.json({ error: "images 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const entry = await saveDiary(date, content, images);
  return NextResponse.json({ entry });
}
