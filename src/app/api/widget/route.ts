import { NextResponse } from "next/server";

import { timingSafeEqual } from "@/lib/auth-cookie";
import { emojiForCategoryColor } from "@/lib/categories";
import { getCategoryNames } from "@/lib/category-name-store";
import { fromDateKey, formatHeaderDate, toDateKey } from "@/lib/date";
import { listByDate } from "@/lib/store";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/widget?token=...&date=YYYY-MM-DD[&format=text|json]
//
// A separate, token-authenticated read endpoint for pulling today's memos
// into an iOS Shortcuts widget — the normal API routes require the signed
// login cookie, which a Shortcut can't carry around. This route is exempted
// from that cookie check in src/proxy.ts and does its own token check
// instead. Disabled (501) until WIDGET_TOKEN is set, since a widget token
// with no set value would otherwise mean "no auth at all".
//
// `date` should be the *device's local* date, formatted yyyy-MM-dd (e.g.
// via Shortcuts' "Format Date" action) — the server has no idea what time
// zone the phone is in, so it never guesses "today" on its own.
export async function GET(request: Request) {
  const expected = process.env.WIDGET_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "위젯이 아직 설정되지 않았어요. WIDGET_TOKEN 환경변수를 추가해주세요." },
      { status: 501 },
    );
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";
  if (!timingSafeEqual(token, expected)) {
    return NextResponse.json({ error: "토큰이 올바르지 않습니다." }, { status: 401 });
  }

  const date = searchParams.get("date") ?? toDateKey(new Date());
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "date 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const todos = (await listByDate(date))
    .filter((t) => !t.parentId) // replies stay out of the widget feed
    .sort((a, b) => a.time.localeCompare(b.time));

  const format = searchParams.get("format") === "json" ? "json" : "text";
  if (format === "json") {
    const categoryNames = await getCategoryNames();
    return NextResponse.json({
      date,
      items: todos.map((t) => ({
        time: t.time,
        text: t.text,
        done: t.done,
        categoryColor: t.categoryColor ?? null,
        categoryName: t.categoryColor ? (categoryNames[t.categoryColor] ?? null) : null,
      })),
    });
  }

  const heading = formatHeaderDate(fromDateKey(date));
  const lines =
    todos.length === 0
      ? ["오늘 남긴 메모가 없어요."]
      : todos.map((t) => {
          const bullet = emojiForCategoryColor(t.categoryColor) ?? "·";
          const strike = t.done ? "✅ " : "";
          return `${bullet} ${t.time} ${strike}${t.text}`;
        });

  return new NextResponse([heading, "", ...lines].join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
