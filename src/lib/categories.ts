// Fixed color palette for the memo category tags. Kept small and fixed
// (rather than a free color picker) so every color has a matching emoji —
// used to render category tags in the plain-text widget feed, where there's
// no CSS to color a dot with.

export const CATEGORY_COLORS = [
  { label: "레드", value: "#ef4444", emoji: "🔴" },
  { label: "오렌지", value: "#f97316", emoji: "🟠" },
  { label: "옐로우", value: "#eab308", emoji: "🟡" },
  { label: "그린", value: "#22c55e", emoji: "🟢" },
  { label: "블루", value: "#3b82f6", emoji: "🔵" },
  { label: "퍼플", value: "#a855f7", emoji: "🟣" },
] as const;

export function emojiForCategoryColor(color: string | undefined): string | null {
  if (!color) return null;
  return CATEGORY_COLORS.find((c) => c.value === color)?.emoji ?? null;
}

export function isKnownCategoryColor(color: string): boolean {
  return CATEGORY_COLORS.some((c) => c.value === color);
}
