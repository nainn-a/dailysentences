import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, checkPassword, createAuthCookieValue } from "@/lib/auth-cookie";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!checkPassword(password)) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const value = await createAuthCookieValue();
  const jar = await cookies();
  jar.set(AUTH_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });

  return NextResponse.json({ ok: true });
}
