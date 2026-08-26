"use client";

import { CalendarDays, Hash, Image as ImageIcon, Search, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { key: "calendar", label: "캘린더", icon: CalendarDays },
  { key: "tag", label: "태그", icon: Hash },
  { key: "image", label: "이미지", icon: ImageIcon },
  { key: "search", label: "검색", icon: Search },
  { key: "settings", label: "설정", icon: Settings },
] as const;

export type NavKey = (typeof NAV_ITEMS)[number]["key"];

/** Bottom tab bar on phones, matching the reference screenshot. */
export function BottomNav({
  active,
  onSelect,
}: {
  active: NavKey;
  onSelect: (key: NavKey) => void;
}) {
  return (
    <nav className="glass flex items-center justify-around border-t border-(--color-border) bg-(--color-surface) px-2 pb-[env(safe-area-inset-bottom)] pt-2 md:hidden">
      {NAV_ITEMS.map(({ key, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(key)}
          aria-label={NAV_ITEMS.find((n) => n.key === key)?.label}
          className={[
            "flex h-11 w-11 items-center justify-center rounded-full transition",
            active === key ? "text-(--color-accent-dark)" : "text-(--color-muted)",
          ].join(" ")}
        >
          <Icon className="h-5 w-5" strokeWidth={active === key ? 2.4 : 2} />
        </button>
      ))}
    </nav>
  );
}

/** Left sidebar on wider (PC) viewports. */
export function SideRail({
  active,
  onSelect,
}: {
  active: NavKey;
  onSelect: (key: NavKey) => void;
}) {
  return (
    <nav className="glass hidden w-20 shrink-0 flex-col items-center gap-1 border-r border-(--color-border) bg-(--color-surface) py-6 md:flex">
      {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(key)}
          className={[
            "flex w-16 flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] font-medium transition",
            active === key
              ? "bg-(--color-accent)/10 text-(--color-accent-dark)"
              : "text-(--color-muted) hover:bg-black/[0.03]",
          ].join(" ")}
        >
          <Icon className="h-5 w-5" strokeWidth={active === key ? 2.4 : 2} />
          {label}
        </button>
      ))}
    </nav>
  );
}
