"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, LogOut, Plus, RotateCcw, Trash2 } from "lucide-react";

import {
  addDays,
  formatHeaderDate,
  formatNowTime,
  monthGridDays,
  startOfMonth,
  startOfWeek,
  toDateKey,
} from "@/lib/date";
import type { Category } from "@/lib/categories";
import type { TodoDTO } from "@/lib/types";
import WeekStrip from "@/components/WeekStrip";
import MonthCalendar from "@/components/MonthCalendar";
import TodoItem from "@/components/TodoItem";
import AddTodoSheet from "@/components/AddTodoSheet";
import DiaryEditor from "@/components/DiaryEditor";
import TrashSheet from "@/components/TrashSheet";

const UNDO_TIMEOUT_MS = 6000;

type ViewMode = "memo" | "diary";

export default function CalendarApp() {
  const router = useRouter();
  const [selected, setSelected] = useState(() => new Date());
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [todos, setTodos] = useState<TodoDTO[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [monthCounts, setMonthCounts] = useState<Record<string, number>>({});
  const [monthDiaryDates, setMonthDiaryDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filterColor, setFilterColor] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("memo");
  // Phones default to the compact week strip; tapping the chevron expands
  // it in place to the full month grid (badges + diary icon included),
  // mirroring the desktop sidebar. Collapses back after picking a date.
  const [mobileCalendarExpanded, setMobileCalendarExpanded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const [undo, setUndo] = useState<{ id: string; label: string } | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  const weekStart = useMemo(() => startOfWeek(selected), [selected]);
  const selectedKey = toDateKey(selected);
  const headerDate = formatHeaderDate(selected);

  const loadWeekCounts = useCallback(async (start: Date) => {
    const end = addDays(start, 6);
    const res = await fetch(
      `/api/todos?start=${toDateKey(start)}&end=${toDateKey(end)}`,
    );
    if (res.ok) {
      const data = await res.json();
      setCounts(data.counts ?? {});
    }
  }, []);

  const loadMonthCounts = useCallback(async (month: Date) => {
    const grid = monthGridDays(month);
    const start = toDateKey(grid[0]);
    const end = toDateKey(grid[grid.length - 1]);
    const [todosRes, diaryRes] = await Promise.all([
      fetch(`/api/todos?start=${start}&end=${end}`),
      fetch(`/api/diary?start=${start}&end=${end}`),
    ]);
    if (todosRes.ok) {
      const data = await todosRes.json();
      setMonthCounts(data.counts ?? {});
    }
    if (diaryRes.ok) {
      const data = await diaryRes.json();
      setMonthDiaryDates(new Set<string>(data.dates ?? []));
    }
  }, []);

  const loadDayTodos = useCallback(async (key: string) => {
    setLoading(true);
    const res = await fetch(`/api/todos?date=${key}`);
    if (res.ok) {
      const data = await res.json();
      setTodos(data.todos ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch + filter reset on date change, not derived state
    setFilterColor(null);
    loadDayTodos(selectedKey);
  }, [selectedKey, loadDayTodos]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on week change, not derived state
    loadWeekCounts(weekStart);
  }, [weekStart, loadWeekCounts]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on visible month change, not derived state
    loadMonthCounts(calendarMonth);
  }, [calendarMonth, loadMonthCounts]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories ?? []);
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    };
  }, []);

  async function handleAdd(
    text: string,
    time: string,
    image?: { id: string; url: string },
    category?: { color: string },
  ) {
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: selectedKey,
        time,
        text,
        imageId: image?.id,
        imageUrl: image?.url,
        categoryColor: category?.color,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setTodos((prev) => [data.todo, ...prev]);
      setCounts((prev) => ({ ...prev, [selectedKey]: (prev[selectedKey] ?? 0) + 1 }));
      setMonthCounts((prev) => ({ ...prev, [selectedKey]: (prev[selectedKey] ?? 0) + 1 }));
      setShowAdd(false);
    }
  }

  async function handleEdit(id: string, text: string, category: { color: string | null }) {
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated: TodoDTO = { ...t, text };
        if (category.color) updated.categoryColor = category.color;
        else delete updated.categoryColor;
        return updated;
      }),
    );
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, categoryColor: category.color ?? null }),
    });
  }

  async function handleDelete(id: string) {
    // Deleting a memo takes its replies down with it — mirror that locally
    // so the count and list stay in sync with the server-side cascade.
    const removed = todos.find((t) => t.id === id);
    const removedCount = todos.filter((t) => t.id === id || t.parentId === id).length;
    setTodos((prev) => prev.filter((t) => t.id !== id && t.parentId !== id));
    setCounts((prev) => ({
      ...prev,
      [selectedKey]: Math.max(0, (prev[selectedKey] ?? removedCount) - removedCount),
    }));
    setMonthCounts((prev) => ({
      ...prev,
      [selectedKey]: Math.max(0, (prev[selectedKey] ?? removedCount) - removedCount),
    }));
    await fetch(`/api/todos/${id}`, { method: "DELETE" });

    // The delete is a soft delete server-side (see store.ts) — this just
    // surfaces an "실행취소" window for the common case of noticing right
    // away (e.g. an accidental long-press). 휴지통 covers noticing later.
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    const label = removed ? (removed.text.length > 24 ? `${removed.text.slice(0, 24)}…` : removed.text) : "메모";
    setUndo({ id, label });
    undoTimerRef.current = window.setTimeout(() => setUndo(null), UNDO_TIMEOUT_MS);
  }

  async function handleUndo() {
    if (!undo) return;
    const id = undo.id;
    setUndo(null);
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    const res = await fetch("/api/todos/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      await Promise.all([
        loadDayTodos(selectedKey),
        loadWeekCounts(weekStart),
        loadMonthCounts(calendarMonth),
      ]);
    }
  }

  async function handleToggleDone(id: string) {
    const target = todos.find((t) => t.id === id);
    if (!target) return;
    const done = !target.done;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
  }

  async function handleReply(parentId: string, text: string): Promise<boolean> {
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedKey, time: formatNowTime(), text, parentId }),
    });
    if (res.ok) {
      const data = await res.json();
      setTodos((prev) => [data.todo, ...prev]);
      setCounts((prev) => ({ ...prev, [selectedKey]: (prev[selectedKey] ?? 0) + 1 }));
      setMonthCounts((prev) => ({ ...prev, [selectedKey]: (prev[selectedKey] ?? 0) + 1 }));
    }
    return res.ok;
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const topLevelTodos = todos.filter((t) => !t.parentId);
  const repliesByParent = todos.reduce<Record<string, TodoDTO[]>>((acc, t) => {
    if (t.parentId) {
      (acc[t.parentId] ??= []).push(t);
    }
    return acc;
  }, {});
  for (const list of Object.values(repliesByParent)) {
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  const usedColors = categories.filter((c) =>
    topLevelTodos.some((t) => t.categoryColor === c.color),
  );
  const visibleTodos = filterColor
    ? topLevelTodos.filter((t) => t.categoryColor === filterColor)
    : topLevelTodos;

  // Picking a day from the desktop month grid can land on a leading/trailing
  // day borrowed from an adjacent month — follow it there.
  function handleSelectDate(day: Date) {
    setSelected(day);
    if (day.getMonth() !== calendarMonth.getMonth() || day.getFullYear() !== calendarMonth.getFullYear()) {
      setCalendarMonth(startOfMonth(day));
    }
  }

  return (
    <>
      {/* Header — the one dark, high-contrast band every screen shares */}
      <header className="flex items-center justify-between bg-(--color-panel) px-4 py-5 sm:px-6">
        <h1 className="font-display text-2xl text-(--color-panel-ink) sm:text-3xl">
          {headerDate}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTrash(true)}
            aria-label="휴지통"
            className="flex h-8 w-8 items-center justify-center rounded-full text-(--color-panel-muted) transition hover:bg-white/10 hover:text-(--color-panel-ink)"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="로그아웃"
            className="flex h-8 w-8 items-center justify-center rounded-full text-(--color-panel-muted) transition hover:bg-white/10 hover:text-(--color-panel-ink)"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Week strip — phones only; wide viewports get the month grid sidebar
          instead. The chevron expands this in place to the same month grid
          (badges + diary icon), collapsing back once a date is picked. */}
      <div className="border-b border-(--color-border) bg-(--color-surface) md:hidden">
        {mobileCalendarExpanded ? (
          <div className="px-4 pb-1 pt-3 sm:px-6">
            <MonthCalendar
              month={calendarMonth}
              selected={selected}
              counts={monthCounts}
              diaryDates={monthDiaryDates}
              onSelectDate={(day) => {
                handleSelectDate(day);
                setMobileCalendarExpanded(false);
              }}
              onChangeMonth={setCalendarMonth}
            />
          </div>
        ) : (
          <WeekStrip
            weekStart={weekStart}
            selected={selected}
            counts={counts}
            onSelect={setSelected}
          />
        )}
        <button
          type="button"
          onClick={() => setMobileCalendarExpanded((v) => !v)}
          aria-label={mobileCalendarExpanded ? "주간 보기로 접기" : "월간 달력 펼치기"}
          className="flex w-full items-center justify-center py-1 text-(--color-muted) transition hover:text-(--color-ink)"
        >
          {mobileCalendarExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Month grid — wide viewports only; phones navigate by the week strip above.
            50/50 split with the day list: w-1/2 + shrink-0 here, flex-1 on the
            list side, so the two always add up to the full width. */}
        <aside className="hidden w-1/2 shrink-0 flex-col gap-4 overflow-y-auto border-r border-(--color-border) bg-(--color-surface) p-6 md:flex">
          <MonthCalendar
            month={calendarMonth}
            selected={selected}
            counts={monthCounts}
            diaryDates={monthDiaryDates}
            onSelectDate={handleSelectDate}
            onChangeMonth={setCalendarMonth}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Memo / Diary segmented toggle */}
          <div className="flex justify-center border-b border-(--color-border) bg-(--color-surface) px-4 py-2 sm:px-6">
            <div className="flex gap-1 rounded-full bg-black/5 p-1">
              {(["memo", "diary"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  className={[
                    "rounded-full px-4 py-1.5 text-sm font-medium transition",
                    view === key
                      ? "bg-(--color-surface-strong) text-(--color-ink) shadow-sm"
                      : "text-(--color-muted)",
                  ].join(" ")}
                >
                  {key === "memo" ? "메모" : "일기"}
                </button>
              ))}
            </div>
          </div>

          {view === "diary" ? (
            <main className="relative flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <DiaryEditor
                date={selectedKey}
                dateLabel={headerDate}
                onSaved={(date, hasContent) =>
                  setMonthDiaryDates((prev) => {
                    const next = new Set(prev);
                    if (hasContent) next.add(date);
                    else next.delete(date);
                    return next;
                  })
                }
              />
            </main>
          ) : (
            /* Todo list */
            <main className="relative flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              {usedColors.length > 0 && (
                <div className="mx-auto mb-4 flex max-w-2xl flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterColor(null)}
                    className={[
                      "rounded-full px-3 py-1 text-xs font-medium transition",
                      filterColor === null
                        ? "bg-(--color-ink) text-white"
                        : "bg-black/5 text-(--color-muted) hover:bg-black/10",
                    ].join(" ")}
                  >
                    전체
                  </button>
                  {usedColors.map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      aria-label={c.name}
                      title={c.name}
                      onClick={() => setFilterColor((cur) => (cur === c.color ? null : c.color))}
                      className={[
                        "h-6 w-6 shrink-0 rounded-full transition",
                        filterColor === c.color ? "ring-2 ring-(--color-accent) ring-offset-2" : "",
                      ].join(" ")}
                      style={{ backgroundColor: c.color }}
                    />
                  ))}
                </div>
              )}

              {loading ? (
                <p className="mt-10 text-center text-sm text-(--color-muted)">불러오는 중…</p>
              ) : visibleTodos.length === 0 ? (
                <div className="mt-16 flex flex-col items-center gap-2 text-center">
                  <p className="text-sm text-(--color-muted)">
                    {filterColor
                      ? "이 색상의 메모가 없어요."
                      : "이 날짜에 남긴 메모가 아직 없어요."}
                  </p>
                  <p className="text-xs text-(--color-muted)">
                    오른쪽 아래 + 버튼으로 새 메모를 추가해보세요.
                  </p>
                </div>
              ) : (
                <div className="mx-auto flex max-w-2xl flex-col gap-3">
                  {visibleTodos.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      replies={repliesByParent[todo.id] ?? []}
                      categories={categories}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      onToggleDone={handleToggleDone}
                      onReply={handleReply}
                    />
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowAdd(true)}
                aria-label="새 메모 추가"
                style={{ backgroundImage: "var(--gradient-accent-glossy)" }}
                className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-full text-(--color-accent-ink) shadow-lg transition hover:brightness-105 active:scale-95 md:bottom-8 md:right-8"
              >
                <Plus className="h-6 w-6" />
              </button>
            </main>
          )}
        </div>
      </div>

      {showAdd && (
        <AddTodoSheet
          dateLabel={headerDate}
          onClose={() => setShowAdd(false)}
          onSubmit={handleAdd}
        />
      )}

      {showTrash && (
        <TrashSheet
          onClose={() => setShowTrash(false)}
          onRestored={() => {
            loadDayTodos(selectedKey);
            loadWeekCounts(weekStart);
            loadMonthCounts(calendarMonth);
          }}
        />
      )}

      {undo && (
        <div className="fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/80 py-2 pl-4 pr-2 text-xs text-white md:bottom-8">
          <span className="max-w-[50vw] truncate">&ldquo;{undo.label}&rdquo; 삭제됨</span>
          <button
            type="button"
            onClick={handleUndo}
            className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 font-semibold transition hover:bg-white/25"
          >
            <RotateCcw className="h-3 w-3" />
            되돌리기
          </button>
        </div>
      )}
    </>
  );
}
