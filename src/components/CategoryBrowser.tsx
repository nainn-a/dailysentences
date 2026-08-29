"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut, Pencil, Plus, RotateCcw, X } from "lucide-react";

import { randomPastelColor, type Category } from "@/lib/categories";
import { formatHeaderDate, formatNowTime, fromDateKey } from "@/lib/date";
import type { TodoDTO } from "@/lib/types";
import TodoItem from "@/components/TodoItem";

const UNDO_TIMEOUT_MS = 6000;

export default function CategoryBrowser() {
  const router = useRouter();
  const [color, setColor] = useState<string | null>(null);
  const [todos, setTodos] = useState<TodoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [renamingColor, setRenamingColor] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [pendingDeleteColor, setPendingDeleteColor] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryColor, setNewCategoryColor] = useState(randomPastelColor);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ id: string; label: string } | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!categoryError) return;
    const timer = window.setTimeout(() => setCategoryError(null), 4000);
    return () => window.clearTimeout(timer);
  }, [categoryError]);

  const load = useCallback(async (c: string) => {
    setLoading(true);
    const res = await fetch(`/api/todos?category=${encodeURIComponent(c)}`);
    setTodos(res.ok ? ((await res.json()).todos ?? []) : []);
    setLoading(false);
  }, []);

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
    // Nothing to fetch with no color selected — the render below shows a
    // prompt instead of the (stale, but hidden) list in that case.
    if (!color) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on color change, not derived state
    load(color);
  }, [color, load]);

  function startRename(c: string) {
    setRenamingColor(c);
    setRenameText(categories.find((cat) => cat.color === c)?.name ?? "");
  }

  async function submitRename() {
    if (!renamingColor) return;
    const target = renamingColor;
    const trimmed = renameText.trim();
    if (!trimmed) return;
    setRenamingColor(null);
    const res = await fetch("/api/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color: target, name: trimmed }),
    });
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories ?? []);
    } else {
      const data = await res.json().catch(() => null);
      setCategoryError(data?.error ?? "이름을 바꾸지 못했어요.");
    }
  }

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color: newCategoryColor, name }),
    });
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories ?? []);
      setNewCategoryName("");
      setAddingCategory(false);
    } else {
      const data = await res.json().catch(() => null);
      setCategoryError(data?.error ?? "카테고리를 추가하지 못했어요.");
    }
  }

  async function handleDeleteCategory(c: string) {
    setCategories((prev) => prev.filter((cat) => cat.color !== c));
    setPendingDeleteColor(null);
    if (color === c) setColor(null);
    const res = await fetch(`/api/categories?color=${encodeURIComponent(c)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories ?? []);
    }
  }

  async function handleDelete(id: string) {
    const removed = todos.find((t) => t.id === id);
    setTodos((prev) => prev.filter((t) => t.id !== id && t.parentId !== id));
    await fetch(`/api/todos/${id}`, { method: "DELETE" });

    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    const label = removed ? (removed.text.length > 24 ? `${removed.text.slice(0, 24)}…` : removed.text) : "메모";
    setUndo({ id, label });
    undoTimerRef.current = window.setTimeout(() => setUndo(null), UNDO_TIMEOUT_MS);
  }

  async function handleUndo() {
    if (!undo || !color) return;
    const id = undo.id;
    setUndo(null);
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    const res = await fetch("/api/todos/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) await load(color);
  }

  async function handleEdit(id: string, text: string, category: { color: string | null }) {
    setTodos((prev) => {
      const updated = prev.map((t) => {
        if (t.id !== id) return t;
        const next: TodoDTO = { ...t, text };
        if (category.color) next.categoryColor = category.color;
        else delete next.categoryColor;
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
      body: JSON.stringify({ text, categoryColor: category.color ?? null }),
    });
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
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2">
          {categories.map((c) =>
            renamingColor === c.color ? (
              <form
                key={c.color}
                onSubmit={(e) => {
                  e.preventDefault();
                  submitRename();
                }}
                className="glass flex items-center gap-1.5 rounded-full border border-(--color-border) bg-(--color-surface-strong) py-1 pl-3 pr-1.5"
              >
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                <input
                  autoFocus
                  aria-label={`${c.name} 이름 입력`}
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setRenamingColor(null);
                  }}
                  maxLength={10}
                  placeholder={c.name}
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
              <div key={c.color} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setColor((cur) => (cur === c.color ? null : c.color))}
                  className={[
                    "flex items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-3 transition",
                    color === c.color
                      ? "bg-(--color-surface-strong) ring-2 ring-(--color-accent)"
                      : "bg-black/5 hover:bg-black/10",
                  ].join(" ")}
                >
                  <span
                    aria-hidden
                    className="h-5 w-5 shrink-0 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-xs font-medium text-(--color-ink)">{c.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => startRename(c.color)}
                  aria-label={`${c.name} 이름 수정`}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-(--color-muted) transition hover:bg-black/5"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    pendingDeleteColor === c.color
                      ? handleDeleteCategory(c.color)
                      : setPendingDeleteColor(c.color)
                  }
                  onBlur={() => setPendingDeleteColor(null)}
                  aria-label={`${c.name} 삭제`}
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition",
                    pendingDeleteColor === c.color
                      ? "bg-red-100 text-red-500"
                      : "text-(--color-muted) hover:bg-black/5",
                  ].join(" ")}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ),
          )}

          <button
            type="button"
            onClick={() => {
              setNewCategoryColor(randomPastelColor());
              setAddingCategory((v) => !v);
            }}
            aria-label="카테고리 추가"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-(--color-border) text-(--color-muted) transition hover:border-(--color-accent) hover:text-(--color-accent-dark)"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {addingCategory && (
          <div className="mx-auto mt-2 flex max-w-4xl items-center gap-2 rounded-xl border border-(--color-border) bg-(--color-surface) px-3 py-2">
            <input
              type="color"
              value={newCategoryColor}
              onChange={(e) => setNewCategoryColor(e.target.value)}
              aria-label="새 카테고리 색상"
              className="h-7 w-7 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0"
            />
            <input
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCategory();
                }
                if (e.key === "Escape") setAddingCategory(false);
              }}
              maxLength={10}
              placeholder="카테고리 이름"
              className="min-w-0 flex-1 bg-transparent text-sm text-(--color-ink) outline-none"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
              className="shrink-0 rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-(--color-ink) disabled:opacity-40"
            >
              추가
            </button>
          </div>
        )}

        {categoryError && (
          <p className="mx-auto mt-2 max-w-4xl text-xs text-red-500">{categoryError}</p>
        )}

        <div className="mx-auto mt-6 flex max-w-4xl flex-col gap-6">
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
                    categories={categories}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onToggleDone={handleToggleDone}
                    onReply={(parentId, text) => handleReply(parentId, text, todo.date)}
                  />
                ))}
              </section>
            ))
          )}
        </div>
      </main>

      {undo && (
        <div className="fixed bottom-8 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/80 py-2 pl-4 pr-2 text-xs text-white">
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
