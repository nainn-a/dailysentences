// Minimal password-gate: no accounts, no OAuth, no database session table.
// A successful /api/login just sets one signed cookie; the proxy (middleware)
// checks it on every request. Signing uses Web Crypto so it works in both
// the Edge (proxy) and Node (API route) runtimes without extra polyfills.

export const AUTH_COOKIE_NAME = "site-auth";
const PAYLOAD = "ok";

// Falls back to a baked-in secret so the app works with zero setup. Set
// AUTH_SECRET in the environment to invalidate existing sessions / harden it.
function getSecret(): string {
  return process.env.AUTH_SECRET || "dailysentences-default-secret-please-change";
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return toHex(sig);
}

export async function createAuthCookieValue(): Promise<string> {
  return hmac(PAYLOAD);
}

export async function isValidAuthCookieValue(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const expected = await hmac(PAYLOAD);
  return timingSafeEqual(value, expected);
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkPassword(input: string): boolean {
  // Falls back to a default passcode so the app is usable with zero setup.
  // Set APP_PASSWORD in the environment to change it.
  const expected = process.env.APP_PASSWORD || "0000";
  return input === expected;
}
