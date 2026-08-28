import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, isValidAuthCookieValue } from "@/lib/auth-cookie";
import { addCategory, getCategories, removeCategory, renameCategory } from "@/lib/categories-store";

async function requireAuth() {
  const jar = await cookies();
  const ok = await isValidAuthCookieValue(jar.get(AUTH_COOKIE_NAME)?.value);
  return ok;
}

// GET /api/categories -> every memo category the user has defined,
// { color, name }[], seeded with the original 6 pastel colors on first use.
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const categories = await getCategories();
  return NextResponse.json({ categories });
}

// POST /api/categories { color, name } -> add a new category.
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const color = typeof body?.color === "string" ? body.color : undefined;
  const name = typeof body?.name === "string" ? body.name : undefined;
  if (!color || !name) {
    return NextResponse.json({ error: "색상과 이름이 필요합니다." }, { status: 400 });
  }

  const result = await addCategory(color, name);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ categories: result.categories }, { status: 201 });
}

// PUT /api/categories { color, name } -> rename an existing category.
export async function PUT(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const color = typeof body?.color === "string" ? body.color : undefined;
  const name = typeof body?.name === "string" ? body.name : "";
  if (!color) {
    return NextResponse.json({ error: "색상이 필요합니다." }, { status: 400 });
  }

  const result = await renameCategory(color, name);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ categories: result.categories });
}

// DELETE /api/categories?color=<hex> -> remove a category. Memos already
// tagged with that color keep their color dot; it just drops out of every
// picker/name lookup.
export async function DELETE(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const color = searchParams.get("color");
  if (!color) {
    return NextResponse.json({ error: "색상이 필요합니다." }, { status: 400 });
  }

  const categories = await removeCategory(color);
  return NextResponse.json({ categories });
}
