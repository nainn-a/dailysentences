// Small date helpers, all working in the browser's local time zone and
// using plain "YYYY-MM-DD" strings so they're trivial to compare/sort and
// safe to store in SQLite without timezone drift.

export const WEEKDAY_LABELS_KO = ["월", "화", "수", "목", "금", "토", "일"] as const;

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Monday of the week containing `d` (matches the 월~일 strip in the UI). */
export function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay(); // 0 = Sun ... 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

export function formatHeaderDate(d: Date): string {
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekday})`;
}

/** The 1st of the month containing `d`, at local midnight. */
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** The 1st of the month `n` months away from `d`'s month. */
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function formatMonthLabel(d: Date): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

/**
 * The Monday-start weeks that fully cover the month containing `d` — the
 * classic 5-6 row month-calendar grid, including the leading/trailing days
 * borrowed from the adjacent months.
 */
export function monthGridDays(d: Date): Date[] {
  const first = startOfMonth(d);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const gridStart = startOfWeek(first);
  const lastWeekday = last.getDay(); // 0 = Sun ... 6 = Sat
  const gridEnd = addDays(last, lastWeekday === 0 ? 0 : 7 - lastWeekday);

  const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / 86_400_000) + 1;
  return Array.from({ length: totalDays }, (_, i) => addDays(gridStart, i));
}

export function formatNowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}
