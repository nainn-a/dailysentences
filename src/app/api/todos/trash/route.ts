import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, isValidAuthCookieValue } from "@/lib/auth-cookie";
import { listTrash, restore } from "@/lib/store";

async function requireAuth() {
  const jar = await cookies();
  const ok = await isValidAuthCookieValue(jar.get(AUTH_COOKIE_NAME)?.value);
  return ok;
}

// GET /api/todos/trash -> memos deleted within the retention window, most
// recently deleted first.
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const todos = await listTrash();
  return NextResponse.json({ todos });
}

// POST /api/todos/trash { id } -> undo one delete.
export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : undefined;
  if (!id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  const todo = await restore(id);
  if (!todo) {
    return NextResponse.json({ error: "복구할 메모를 찾을 수 없어요." }, { status: 404 });
  }
  return NextResponse.json({ todo });
}
