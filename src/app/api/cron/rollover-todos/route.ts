import { NextResponse } from "next/server";

import { timingSafeEqual } from "@/lib/auth-cookie";
import { findTodoCategory } from "@/lib/categories";
import { getCategories } from "@/lib/categories-store";
import { rollOverIncompleteTodos } from "@/lib/store";

const KOREA_TIME_ZONE = "Asia/Seoul";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function dateKeyInKorea(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KOREA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (
    !expected ||
    scheme !== "Bearer" ||
    !token ||
    !timingSafeEqual(token, expected)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todoCategory = findTodoCategory(await getCategories());
  if (!todoCategory) {
    return NextResponse.json({ ok: true, created: 0, skipped: 0, reason: "todo category missing" });
  }

  const now = new Date();
  const toDate = dateKeyInKorea(now);
  const fromDate = dateKeyInKorea(new Date(now.getTime() - ONE_DAY_MS));
  const result = await rollOverIncompleteTodos({
    fromDate,
    toDate,
    categoryColor: todoCategory.color,
  });

  return NextResponse.json({
    ok: true,
    fromDate,
    toDate,
    created: result.created.length,
    skipped: result.skipped,
  });
}
