"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Plus } from "lucide-react";

import {
  addDays,
  formatHeaderDate,
  startOfWeek,
  toDateKey,
} from "@/lib/date";
import type { TodoDTO } from "@/lib/types";
import WeekStrip from "@/components/WeekStrip";
import TodoItem from "@/components/TodoItem";
import AddTodoSheet from "@/components/AddTodoSheet";
import { BottomNav, SideRail, type NavKey } from "@/components/NavRail";

export default function CalendarApp() {
  const router = useRouter();
  const [selected, setSelected] = useState(() => new Date());
  const [todos, setTodos] = useState<TodoDTO[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [nav, setNav] = useState<NavKey>("calendar");
  const [notice, setNotice] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on date change, not derived state
    loadDayTodos(selectedKey);
  }, [selectedKey, loadDayTodos]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on week change, not derived state
    loadWeekCounts(weekStart);
  }, [weekStart, loadWeekCounts]);

  async function handleAdd(text: string, time: string) {
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedKey, time, text }),
    });
    if (res.ok) {
      const data = await res.json();
      setTodos((prev) => [data.todo, ...prev]);
      setCounts((prev) => ({ ...prev, [selectedKey]: (prev[selectedKey] ?? 0) + 1 }));
      setShowAdd(false);
    }
  }

  async function handleToggle(id: string, done: boolean) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
  }

  async function handleDelete(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    setCounts((prev) => ({
      ...prev,
      [selectedKey]: Math.max(0, (prev[selectedKey] ?? 1) - 1),
    }));
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  function handleNavSelect(key: NavKey) {
    setNav(key);
    if (key !== "calendar") {
      setNotice("준비 중인 기능이에요");
      window.setTimeout(() => setNotice(null), 1600);
      setNav("calendar");
    }
  }

  return (
    <div className="flex h-dvh min-h-dvh bg-(--color-app-bg)">
      <SideRail active={nav} onSelect={handleNavSelect} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-(--color-border) bg-(--color-surface) px-4 py-4 sm:px-6">
          <h1 className="text-xl font-semibold text-(--color-ink)">{headerDate}</h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLogout}
              aria-label="로그아웃"
              className="flex h-8 w-8 items-center justify-center rounded-full text-(--color-muted) transition hover:bg-black/5"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Week strip */}
        <div className="border-b border-(--color-border) bg-(--color-surface)">
          <WeekStrip
            weekStart={weekStart}
            selected={selected}
            counts={counts}
            onSelect={setSelected}
          />
        </div>

        {/* Todo list */}
        <main className="relative flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {loading ? (
            <p className="mt-10 text-center text-sm text-(--color-muted)">불러오는 중…</p>
          ) : todos.length === 0 ? (
            <div className="mt-16 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-(--color-muted)">
                이 날짜에 남긴 메모가 아직 없어요.
              </p>
              <p className="text-xs text-(--color-muted)">
                오른쪽 아래 + 버튼으로 새 메모를 추가해보세요.
              </p>
            </div>
          ) : (
            <div className="mx-auto flex max-w-2xl flex-col gap-3">
              {todos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowAdd(true)}
            aria-label="새 메모 추가"
            className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-(--color-accent) text-(--color-accent-ink) shadow-lg transition hover:bg-(--color-accent-dark) active:scale-95 md:bottom-8 md:right-8"
          >
            <Plus className="h-6 w-6" />
          </button>

          {notice && (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-xs text-white md:bottom-8">
              {notice}
            </div>
          )}
        </main>

        <BottomNav active={nav} onSelect={handleNavSelect} />
      </div>

      {showAdd && (
        <AddTodoSheet
          dateLabel={headerDate}
          onClose={() => setShowAdd(false)}
          onSubmit={handleAdd}
        />
      )}
    </div>
  );
}
