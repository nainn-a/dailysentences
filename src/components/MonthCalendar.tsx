"use client";

import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

import {
  addMonths,
  formatMonthLabel,
  isSameDay,
  monthGridDays,
  toDateKey,
  WEEKDAY_LABELS_KO,
} from "@/lib/date";

/** Month-grid date picker for wide (PC) viewports — sits beside the day list. */
export default function MonthCalendar({
  month,
  selected,
  counts,
  diaryDates,
  onSelectDate,
  onChangeMonth,
}: {
  /** Any date within the month currently on screen. */
  month: Date;
  selected: Date;
  /** Memo count per date key ("YYYY-MM-DD"). */
  counts: Record<string, number>;
  /** Date keys that have a non-empty 일기 entry. */
  diaryDates: Set<string>;
  onSelectDate: (d: Date) => void;
  onChangeMonth: (month: Date) => void;
}) {
  const days = monthGridDays(month);
  const today = new Date();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-(--color-ink)">{formatMonthLabel(month)}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChangeMonth(addMonths(month, -1))}
            aria-label="이전 달"
            className="flex h-8 w-8 items-center justify-center rounded-full text-(--color-muted) transition hover:bg-black/5"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onChangeMonth(addMonths(month, 1))}
            aria-label="다음 달"
            className="flex h-8 w-8 items-center justify-center rounded-full text-(--color-muted) transition hover:bg-black/5"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-2">
        {WEEKDAY_LABELS_KO.map((label) => (
          <span
            key={label}
            className="pb-1 text-center text-xs font-medium text-(--color-muted)"
          >
            {label}
          </span>
        ))}

        {days.map((day) => {
          const key = toDateKey(day);
          const inMonth = day.getMonth() === month.getMonth();
          const isSelected = isSameDay(day, selected);
          const isToday = isSameDay(day, today);
          const memoCount = counts[key] ?? 0;
          const hasDiary = diaryDates.has(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(day)}
              className="flex flex-col items-center gap-1.5 rounded-lg py-1.5 transition hover:bg-black/[0.03]"
            >
              <span
                style={isSelected ? { backgroundImage: "var(--gradient-accent-glossy)" } : undefined}
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition",
                  isSelected
                    ? "text-(--color-accent-ink) shadow-sm"
                    : !inMonth
                      ? "text-(--color-muted)/40"
                      : isToday
                        ? "text-(--color-accent-dark)"
                        : "text-(--color-ink)",
                ].join(" ")}
              >
                {day.getDate()}
              </span>
              {/* 이 날짜의 메모 개수(숫자 뱃지)와 일기 작성 여부(책 아이콘) —
                  둘 다 없으면 자리만 비워 다른 날과 높이를 맞춘다. */}
              <span className="flex h-4 items-center gap-1">
                {memoCount > 0 && (
                  <span
                    className={[
                      "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                      isSelected
                        ? "bg-(--color-accent)/20 text-(--color-accent-dark)"
                        : "bg-(--color-accent)/15 text-(--color-accent-dark)",
                    ].join(" ")}
                  >
                    {memoCount}
                  </span>
                )}
                {hasDiary && (
                  <BookOpen
                    aria-label="일기 작성함"
                    className="h-3 w-3 shrink-0 text-(--color-ink)"
                    strokeWidth={2.25}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
