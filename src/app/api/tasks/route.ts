import { NextResponse } from "next/server";

import { timingSafeEqual } from "@/lib/auth-cookie";
import { findTodoCategory } from "@/lib/categories";
import { getCategories } from "@/lib/categories-store";
import { toDateKey } from "@/lib/date";
import { listByDate, listIncomplete } from "@/lib/store";

// Only memos tagged with this category name are synced to Obsidian — a
// plain memo with no category (or a different one) never shows up here.
// If no category with this name exists yet, every result is filtered out;
// create one with exactly this name in the 카테고리 tab to enable the sync.
// GET /api/tasks[?date=today]
//
// A separate, Bearer-token-authenticated read endpoint for pulling memos
// into Obsidian (a Templater user script running in the desktop app's Node
// runtime) — independent of the Google-login cookie, which a script fetching
// from outside the browser can't carry around. No CORS is opened since
// nothing calls this from a browser; see PUBLIC_PATHS in src/proxy.ts for
// the login-cookie-gate exemption.
//
// Disabled (501) until OBSIDIAN_API_TOKEN is set, since an unset token would
// otherwise mean "no auth at all".
//
// ?date=today   -> that day's "todo"-tagged items (done and not-done alike)
// no ?date      -> every not-yet-done "todo"-tagged item, across every date
export async function GET(request: Request) {
  const expected = process.env.OBSIDIAN_API_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "Obsidian 연동이 아직 설정되지 않았어요. OBSIDIAN_API_TOKEN 환경변수를 추가해주세요." },
      { status: 501 },
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token || !timingSafeEqual(token, expected)) {
    return NextResponse.json({ error: "토큰이 올바르지 않습니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (date !== null && date !== "today") {
    return NextResponse.json({ error: "date는 'today'만 지원합니다." }, { status: 400 });
  }

  const todos = date === "today" ? await listByDate(toDateKey(new Date())) : await listIncomplete();
  const categories = await getCategories();
  const taskColor = findTodoCategory(categories)?.color;

  return NextResponse.json(
    todos
      // replies aren't standalone tasks; only "todo"-tagged memos sync — and
      // taskColor being undefined (category doesn't exist yet) must mean
      // "match nothing", not "match every uncategorized memo".
      .filter((t) => !t.parentId && !!taskColor && t.categoryColor === taskColor)
      .map((t) => ({
        id: t.id,
        text: t.text,
        date: t.date,
        time: t.time,
        completed: t.done,
        completedAt: t.completedAt ?? null,
      })),
  );
}
