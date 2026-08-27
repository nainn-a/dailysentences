"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut, Pencil, X } from "lucide-react";

import { CATEGORY_COLORS } from "@/lib/categories";
import { formatHeaderDate, formatNowTime, fromDateKey } from "@/lib/date";
import type { TodoDTO } from "@/lib/types";
import TodoItem from "@/components/TodoItem";

export default function CategoryBrowser() {
  const router = useRouter();
  const [color, setColor] = useState<string | null>(null);
  const [todos, setTodos] = useState<TodoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const [renamingColor, setRenamingColor] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  const load = useCallback(async (c: string) => {
    setLoading(true);
    const res = await fetch(`/api/todos?category=${encodeURIComponent(c)}`);
    setTodos(res.ok ? ((await res.json()).todos ?? []) : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/category-names");
      if (res.ok) {
        const data = await res.json();
        setNames(data.names ?? {});
      }
    })();
  }, []);

  useEffect(() => {
    // Nothing to fetch with no color selected — the render below shows a
    // prompt instead of the (stale, but hidden) list in that case.
    if (!color) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on color change, not derived state
    load(color);
  }, [color, load]);

  function startRename(c: string) {
    setRenamingColor(c);
    setRenameText(names[c] ?? "");
  }

  async function submitRename() {
    if (!renamingColor) return;
    const target = renamingColor;
    const trimmed = renameText.trim();
    setNames((prev) => {
      const next = { ...prev };
      if (trimmed) next[target] = trimmed;
      else delete next[target];
      return next;
    });
    setRenamingColor(null);
    await fetch("/api/category-names", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color: target, name: trimmed }),
    });
  }

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
          {CATEGORY_COLORS.map((c) =>
            renamingColor === c.value ? (
              <form
                key={c.value}
                onSubmit={(e) => {
                  e.preventDefault();
                  submitRename();
                }}
                className="glass flex items-center gap-1.5 rounded-full border border-(--color-border) bg-(--color-surface-strong) py-1 pl-3 pr-1.5"
              >
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: c.value }}
                />
                <input
                  autoFocus
                  aria-label={`${c.label} 이름 입력`}
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setRenamingColor(null);
                  }}
                  maxLength={10}
                  placeholder={c.label}
                  className="w-16 bg-transparent text-xs text-(--color-ink) outline-none"
                />
                <button
                  type="submit"
                  aria-label="이름 저장"
                  className="flex h-5 w-5 shrink-0 items-center justify-center text-(--color-accent-dark)"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setRenamingColor(null)}
                  aria-label="이름 수정 취소"
                  className="flex h-5 w-5 shrink-0 items-center justify-center text-(--color-muted)"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            ) : (
              <div key={c.value} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setColor((cur) => (cur === c.value ? null : c.value))}
                  className={[
                    "flex items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-3 transition",
                    color === c.value
                      ? "bg-(--color-surface-strong) ring-2 ring-(--color-accent)"
                      : "bg-black/5 hover:bg-black/10",
                  ].join(" ")}
                >
                  <span
                    aria-hidden
                    className="h-5 w-5 shrink-0 rounded-full"
                    style={{ backgroundColor: c.value }}
                  />
                  <span className="text-xs font-medium text-(--color-ink)">
                    {names[c.value] || c.label}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => startRename(c.value)}
                  aria-label={`${c.label} 이름 수정`}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-(--color-muted) transition hover:bg-black/5"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            ),
          )}
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
