import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";

export async function POST() {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
