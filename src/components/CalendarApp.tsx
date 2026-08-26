"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Plus } from "lucide-react";

import {
  addDays,
  formatHeaderDate,
  formatNowTime,
  startOfWeek,
  toDateKey,
} from "@/lib/date";
import type { TodoDTO } from "@/lib/types";
import WeekStrip from "@/components/WeekStrip";
import TodoItem from "@/components/TodoItem";
import AddTodoSheet from "@/components/AddTodoSheet";

export default function CalendarApp() {
  const router = useRouter();
  const [selected, setSelected] = useState(() => new Date());
  const [todos, setTodos] = useState<TodoDTO[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

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

  async function handleAdd(
    text: string,
    time: string,
    image?: { id: string; url: string },
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
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setTodos((prev) => [data.todo, ...prev]);
      setCounts((prev) => ({ ...prev, [selectedKey]: (prev[selectedKey] ?? 0) + 1 }));
      setShowAdd(false);
    }
  }

  async function handleEdit(id: string, text: string) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t)));
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  }

  async function handleDelete(id: string) {
    // Deleting a memo takes its replies down with it — mirror that locally
    // so the count and list stay in sync with the server-side cascade.
    const removedCount = todos.filter((t) => t.id === id || t.parentId === id).length;
    setTodos((prev) => prev.filter((t) => t.id !== id && t.parentId !== id));
    setCounts((prev) => ({
      ...prev,
      [selectedKey]: Math.max(0, (prev[selectedKey] ?? removedCount) - removedCount),
    }));
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
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

  return (
    <>
      {/* Header */}
      <header className="glass flex items-center justify-between border-b border-(--color-border) bg-(--color-surface) px-4 py-4 sm:px-6">
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
      <div className="glass border-b border-(--color-border) bg-(--color-surface)">
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
        ) : topLevelTodos.length === 0 ? (
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
            {topLevelTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                replies={repliesByParent[todo.id] ?? []}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onReply={handleReply}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowAdd(true)}
          aria-label="새 메모 추가"
          style={{ backgroundImage: "var(--gradient-accent)" }}
          className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-full text-(--color-accent-ink) shadow-lg transition hover:brightness-105 active:scale-95 md:bottom-8 md:right-8"
        >
          <Plus className="h-6 w-6" />
        </button>
      </main>

      {showAdd && (
        <AddTodoSheet
          dateLabel={headerDate}
          onClose={() => setShowAdd(false)}
          onSubmit={handleAdd}
        />
      )}
    </>
  );
}
