// A memo category is now a user-defined { color, name } pair (see
// categories-store.ts) rather than a fixed palette — this file just keeps
// the client-safe bits: the shared type, and default seed data for a
// brand-new install.

export type Category = {
  color: string;
  name: string;
};

export const DEFAULT_CATEGORIES: Category[] = [
  { color: "#f5a8a8", name: "레드" },
  { color: "#f8c99c", name: "오렌지" },
  { color: "#f2df9c", name: "옐로우" },
  { color: "#a9dfba", name: "그린" },
  { color: "#a6cdf0", name: "블루" },
  { color: "#cbb4ee", name: "퍼플" },
];

export const MAX_CATEGORY_NAME_LENGTH = 10;
export const MAX_CATEGORIES = 24;

export const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

// Only the original seed colors get a fixed emoji — used for the plain-text
// widget feed, where there's no CSS to color a dot with. A freely-chosen
// custom color just falls back to a plain bullet there.
const DEFAULT_EMOJI: Record<string, string> = {
  "#f5a8a8": "🔴",
  "#f8c99c": "🟠",
  "#f2df9c": "🟡",
  "#a9dfba": "🟢",
  "#a6cdf0": "🔵",
  "#cbb4ee": "🟣",
};

export function emojiForCategoryColor(color: string | undefined): string | null {
  if (!color) return null;
  return DEFAULT_EMOJI[color.toLowerCase()] ?? "•";
}

// A fresh, gentle pastel to pre-fill the "new category" color picker with —
// mainly so it doesn't default to a fixed hex that happens to already be
// taken (the seeded palette's own red, say), which would otherwise reject
// the very first add attempt with a confusing "already exists" error.
export function randomPastelColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return hslToHex(hue, 62, 82);
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (n: number) =>
    Math.round(f(n) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(0)}${toHex(8)}${toHex(4)}`;
}
