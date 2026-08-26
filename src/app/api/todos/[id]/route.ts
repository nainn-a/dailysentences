import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, isValidAuthCookieValue } from "@/lib/auth-cookie";
import { remove, update } from "@/lib/store";

async function requireAuth() {
  const jar = await cookies();
  const ok = await isValidAuthCookieValue(jar.get(AUTH_COOKIE_NAME)?.value);
  return ok;
}

// PATCH /api/todos/:id { done?, text? } -> toggle completion or edit text.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const patch: { done?: boolean; text?: string } = {};

  if (typeof body?.done === "boolean") patch.done = body.done;
  if (typeof body?.text === "string") {
    const text = body.text.trim();
    if (!text) {
      return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
    }
    patch.text = text;
  }

  const todo = await update(id, patch);
  if (!todo) {
    return NextResponse.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ todo });
}

// DELETE /api/todos/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const ok = await remove(id);
  if (!ok) {
    return NextResponse.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
