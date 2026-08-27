"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { CATEGORY_COLORS } from "@/lib/categories";
import { formatHeaderDate, formatNowTime, fromDateKey } from "@/lib/date";
import type { TodoDTO } from "@/lib/types";
import TodoItem from "@/components/TodoItem";

export default function CategoryBrowser() {
  const router = useRouter();
  const [color, setColor] = useState<string | null>(null);
  const [todos, setTodos] = useState<TodoDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (c: string) => {
    setLoading(true);
    const res = await fetch(`/api/todos?category=${encodeURIComponent(c)}`);
    setTodos(res.ok ? ((await res.json()).todos ?? []) : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Nothing to fetch with no color selected — the render below shows a
    // prompt instead of the (stale, but hidden) list in that case.
    if (!color) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on color change, not derived state
    load(color);
  }, [color, load]);

  async function handleDelete(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id && t.parentId !== id));
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
  }

  async function handleEdit(
    id: string,
    text: string,
    category: { color: string | null; label?: string },
  ) {
    setTodos((prev) => {
      const updated = prev.map((t) => {
        if (t.id !== id) return t;
        const next: TodoDTO = { ...t, text };
        if (category.color) {
          next.categoryColor = category.color;
          next.categoryLabel = category.label;
        } else {
          delete next.categoryColor;
          delete next.categoryLabel;
        }
        return next;
      });
      // Recolored away from the tab we're browsing — it (and its replies)
      // no longer belong on this screen.
      const edited = updated.find((t) => t.id === id);
      if (edited && !edited.parentId && edited.categoryColor !== color) {
        return updated.filter((t) => t.id !== id && t.parentId !== id);
      }
      return updated;
    });
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        categoryColor: category.color ?? null,
        categoryLabel: category.color ? (category.label ?? null) : null,
      }),
    });
  }

  async function handleReply(parentId: string, text: string, date: string): Promise<boolean> {
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, time: formatNowTime(), text, parentId }),
    });
    if (res.ok) {
      const data = await res.json();
      setTodos((prev) => [data.todo, ...prev]);
    }
    return res.ok;
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const topLevel = todos.filter((t) => !t.parentId);
  const repliesByParent = todos.reduce<Record<string, TodoDTO[]>>((acc, t) => {
    if (t.parentId) {
      (acc[t.parentId] ??= []).push(t);
    }
    return acc;
  }, {});
  for (const list of Object.values(repliesByParent)) {
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  const groupedByDate = topLevel.reduce<Record<string, TodoDTO[]>>((acc, t) => {
    (acc[t.date] ??= []).push(t);
    return acc;
  }, {});
  const dateKeys = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
  for (const list of Object.values(groupedByDate)) {
    list.sort((a, b) => b.time.localeCompare(a.time));
  }

  return (
    <>
      <header className="glass flex items-center justify-between border-b border-(--color-border) bg-(--color-surface) px-4 py-4 sm:px-6">
        <h1 className="text-xl font-semibold text-(--color-ink)">카테고리</h1>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="로그아웃"
          className="flex h-8 w-8 items-center justify-center rounded-full text-(--color-muted) transition hover:bg-black/5"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <main className="relative flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-label={c.label}
              onClick={() => setColor((cur) => (cur === c.value ? null : c.value))}
              className={[
                "h-8 w-8 shrink-0 rounded-full transition",
                color === c.value ? "ring-2 ring-(--color-accent) ring-offset-2" : "",
              ].join(" ")}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>

        <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-6">
          {!color ? (
            <p className="mt-10 text-center text-sm text-(--color-muted)">
              위에서 색상을 고르면 그 카테고리의 메모를 날짜와 상관없이 모아볼 수 있어요.
            </p>
          ) : loading ? (
            <p className="mt-10 text-center text-sm text-(--color-muted)">불러오는 중…</p>
          ) : dateKeys.length === 0 ? (
            <p className="mt-10 text-center text-sm text-(--color-muted)">
              이 카테고리로 남긴 메모가 아직 없어요.
            </p>
          ) : (
            dateKeys.map((date) => (
              <section key={date} className="flex flex-col gap-3">
                <h2 className="text-xs font-medium text-(--color-muted)">
                  {formatHeaderDate(fromDateKey(date))}
                </h2>
                {groupedByDate[date].map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    replies={repliesByParent[todo.id] ?? []}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onReply={(parentId, text) => handleReply(parentId, text, todo.date)}
                  />
                ))}
              </section>
            ))
          )}
        </div>
      </main>
    </>
  );
}
