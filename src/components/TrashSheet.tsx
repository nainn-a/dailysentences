"use client";

import { useEffect, useState } from "react";
import { RotateCcw, X } from "lucide-react";

import { formatHeaderDate, fromDateKey } from "@/lib/date";
import type { TodoDTO } from "@/lib/types";

// 휴지통 — memos deleted within the last 7 days (see TRASH_RETENTION_MS in
// store.ts), each restorable with one tap. Opened from a header button in
// CalendarApp; independent of which date/category screen the user is on,
// since a delete can happen from either.
export default function TrashSheet({ onClose, onRestored }: { onClose: () => void; onRestored: () => void }) {
  const [todos, setTodos] = useState<TodoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/todos/trash");
      if (res.ok) {
        const data = await res.json();
        setTodos(data.todos ?? []);
      }
      setLoading(false);
    })();
  }, []);

  async function handleRestore(id: string) {
    setRestoringId(id);
    const res = await fetch("/api/todos/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setTodos((prev) => prev.filter((t) => t.id !== id));
      onRestored();
    }
    setRestoringId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0" />

      <div className="glass relative flex max-h-[80vh] w-full max-w-md flex-col rounded-t-3xl bg-(--color-surface-strong) p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-xl sm:rounded-3xl sm:pb-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-(--color-border) sm:hidden" />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-(--color-ink)">휴지통</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-7 w-7 items-center justify-center rounded-full text-(--color-muted) transition hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-(--color-muted)">삭제한 메모는 7일 동안 여기서 복구할 수 있어요.</p>

        <div className="mt-3 flex-1 overflow-y-auto">
          {loading ? (
            <p className="mt-8 text-center text-sm text-(--color-muted)">불러오는 중…</p>
          ) : todos.length === 0 ? (
            <p className="mt-8 text-center text-sm text-(--color-muted)">휴지통이 비어있어요.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {todos.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-center gap-3 rounded-2xl bg-(--color-pill) px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-(--color-muted)">
                      {formatHeaderDate(fromDateKey(todo.date))} · {todo.time}
                    </p>
                    <p className="truncate text-sm text-(--color-ink)">{todo.text}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestore(todo.id)}
                    disabled={restoringId === todo.id}
                    className="flex shrink-0 items-center gap-1 rounded-full bg-(--color-surface) px-3 py-1.5 text-xs font-medium text-(--color-accent-dark) transition hover:brightness-105 disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    복구
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
