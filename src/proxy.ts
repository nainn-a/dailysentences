import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AUTH_COOKIE_NAME, isValidAuthCookieValue } from "@/lib/auth-cookie";

// Reachable without a valid session — the password-check endpoint itself
// must be, or nobody could ever log in.
const PUBLIC_PATHS = new Set(["/login", "/api/login"]);

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLoggedIn = await isValidAuthCookieValue(req.cookies.get(AUTH_COOKIE_NAME)?.value);

  if (pathname === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/calendar", req.nextUrl.origin));
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except static assets / Next internals — the password gate
  // covers the whole app (pages + API), /login itself is excluded above.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
