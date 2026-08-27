import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, isValidAuthCookieValue } from "@/lib/auth-cookie";
import { isKnownCategoryColor } from "@/lib/categories";
import { MAX_CATEGORY_NAME_LENGTH, getCategoryNames, setCategoryName } from "@/lib/category-name-store";

async function requireAuth() {
  const jar = await cookies();
  const ok = await isValidAuthCookieValue(jar.get(AUTH_COOKIE_NAME)?.value);
  return ok;
}

// GET /api/category-names -> { names: { [colorHex]: string } }, for every
// color that has a custom name set (colors without one just fall back to
// their default "레드"/"블루"/... label on the client).
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const names = await getCategoryNames();
  return NextResponse.json({ names });
}

// PUT /api/category-names { color, name } -> fixes that color's display
// name; an empty name clears it back to the default color label.
export async function PUT(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const color = typeof body?.color === "string" ? body.color : "";
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, MAX_CATEGORY_NAME_LENGTH) : "";

  if (!isKnownCategoryColor(color)) {
    return NextResponse.json({ error: "지원하지 않는 카테고리 색상입니다." }, { status: 400 });
  }

  const names = await setCategoryName(color, name);
  return NextResponse.json({ names });
}
