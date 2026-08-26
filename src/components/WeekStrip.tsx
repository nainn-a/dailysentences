"use client";

import { addDays, isSameDay, toDateKey, WEEKDAY_LABELS_KO } from "@/lib/date";

export default function WeekStrip({
  weekStart,
  selected,
  counts,
  onSelect,
}: {
  weekStart: Date;
  selected: Date;
  counts: Record<string, number>;
  onSelect: (d: Date) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div className="grid grid-cols-7 gap-1 px-4 py-3 sm:px-6">
      {days.map((day, i) => {
        const key = toDateKey(day);
        const isSelected = isSameDay(day, selected);
        const isToday = isSameDay(day, today);
        const hasEntries = (counts[key] ?? 0) > 0;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(day)}
            className="flex flex-col items-center gap-1.5 rounded-xl py-1.5 transition hover:bg-black/[0.03]"
          >
            <span className="text-xs font-medium text-(--color-muted)">
              {WEEKDAY_LABELS_KO[i]}
            </span>
            <span
              style={isSelected ? { backgroundImage: "var(--gradient-accent)" } : undefined}
              className={[
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition",
                isSelected
                  ? "text-(--color-accent-ink) shadow-sm"
                  : isToday
                    ? "text-(--color-accent-dark)"
                    : "text-(--color-ink)",
              ].join(" ")}
            >
              {day.getDate()}
            </span>
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                hasEntries ? "bg-(--color-accent)" : "bg-transparent",
              ].join(" ")}
            />
          </button>
        );
      })}
    </div>
  );
}
