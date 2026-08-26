import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, isValidAuthCookieValue } from "@/lib/auth-cookie";
import { countsBetween, create, findTopLevel, listByDate } from "@/lib/store";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

async function requireAuth() {
  const jar = await cookies();
  const ok = await isValidAuthCookieValue(jar.get(AUTH_COOKIE_NAME)?.value);
  return ok;
}

// GET /api/todos?date=YYYY-MM-DD          -> that day's items, newest first
// GET /api/todos?start=YYYY-MM-DD&end=... -> { "YYYY-MM-DD": count, ... }
//     used to paint the "has entries" dot under each day in the week strip.
export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (date) {
    if (!DATE_RE.test(date)) {
      return NextResponse.json({ error: "date 형식이 올바르지 않습니다." }, { status: 400 });
    }
    const todos = await listByDate(date);
    return NextResponse.json({ todos });
  }

  if (start && end) {
    if (!DATE_RE.test(start) || !DATE_RE.test(end)) {
      return NextResponse.json({ error: "start/end 형식이 올바르지 않습니다." }, { status: 400 });
    }
    const counts = await countsBetween(start, end);
    return NextResponse.json({ counts });
  }

  return NextResponse.json(
    { error: "date 또는 start/end 쿼리 파라미터가 필요합니다." },
    { status: 400 },
  );
}

// POST /api/todos { date, time, text } -> creates one memo/todo pill.
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const date = typeof body?.date === "string" ? body.date : "";
  const time = typeof body?.time === "string" ? body.time : "";
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  // Both come from a prior /api/images upload — see AddTodoSheet.
  const imageId = typeof body?.imageId === "string" ? body.imageId : undefined;
  const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl : undefined;
  // Set when this is a reply to another memo — see TodoItem's reply composer.
  const parentId = typeof body?.parentId === "string" ? body.parentId : undefined;

  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "date 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (!TIME_RE.test(time)) {
    return NextResponse.json({ error: "time 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
  }
  if (text.length > 200) {
    return NextResponse.json({ error: "내용은 200자 이내로 입력해주세요." }, { status: 400 });
  }
  if (parentId && !(await findTopLevel(date, parentId))) {
    return NextResponse.json(
      { error: "답장을 남길 메모를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const todo = await create({ date, time, text, imageId, imageUrl, parentId });
  return NextResponse.json({ todo }, { status: 201 });
}
