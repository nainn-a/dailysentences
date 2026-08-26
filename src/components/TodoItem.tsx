"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CornerDownRight, Pencil, X } from "lucide-react";

import { CATEGORY_COLORS } from "@/lib/categories";
import type { TodoDTO } from "@/lib/types";

const LONG_PRESS_MS = 500;

export default function TodoItem({
  todo,
  replies = [],
  onDelete,
  onEdit,
  onReply,
  isReply = false,
}: {
  todo: TodoDTO;
  replies?: TodoDTO[];
  onDelete: (id: string) => void;
  onEdit?: (id: string, text: string, category: { color: string | null; label?: string }) => void;
  onReply?: (parentId: string, text: string) => Promise<boolean>;
  isReply?: boolean;
}) {
  const [pendingDelete, setPendingDelete] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [editCategoryColor, setEditCategoryColor] = useState<string | null>(
    todo.categoryColor ?? null,
  );
  const [editCategoryLabel, setEditCategoryLabel] = useState(todo.categoryLabel ?? "");
  const pressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pressTimerRef.current !== null) window.clearTimeout(pressTimerRef.current);
    };
  }, []);

  async function submitReply() {
    const trimmed = replyText.trim();
    if (!trimmed || !onReply) return;
    setSending(true);
    const ok = await onReply(todo.id, trimmed);
    setSending(false);
    if (ok) {
      setReplyText("");
      setReplying(false);
    }
  }

  function startEdit() {
    setEditText(todo.text);
    setEditCategoryColor(todo.categoryColor ?? null);
    setEditCategoryLabel(todo.categoryLabel ?? "");
    setEditing(true);
  }

  function submitEdit() {
    const trimmed = editText.trim();
    if (trimmed) {
      onEdit?.(todo.id, trimmed, {
        color: editCategoryColor,
        label: editCategoryLabel.trim() || undefined,
      });
    }
    setEditing(false);
  }

  function clearPressTimer() {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }

  // Tap the memo to edit it; press and hold to delete it — no more
  // click-to-toggle-done (that "middle line" strikethrough tap surprised
  // people on mobile, where there's no hover to warn them what a tap does).
  function handlePressStart() {
    longPressFiredRef.current = false;
    clearPressTimer();
    pressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
      onDelete(todo.id);
    }, LONG_PRESS_MS);
  }

  function handlePressEnd() {
    clearPressTimer();
  }

  function handlePillClick() {
    if (longPressFiredRef.current) {
      // Swallow the click that follows a long-press delete.
      longPressFiredRef.current = false;
      return;
    }
    startEdit();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="w-11 shrink-0 text-right text-xs tabular-nums text-(--color-muted)">
          {todo.time}
        </span>

        <div className="glass flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-(--color-pill) px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition">
          {todo.imageUrl && (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              aria-label="사진 크게 보기"
              className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-(--color-border)"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded image from Blob/local API, not a static build asset */}
              <img src={todo.imageUrl} alt="" className="h-full w-full object-cover" />
            </button>
          )}

          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitEdit();
              }}
              className="flex min-w-0 flex-1 flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  aria-label="메모 수정"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditing(false);
                  }}
                  maxLength={200}
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-(--color-ink) outline-none"
                />
                <button
                  type="submit"
                  disabled={!editText.trim()}
                  aria-label="저장"
                  className="shrink-0 text-(--color-accent-dark) disabled:opacity-40"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  aria-label="수정 취소"
                  className="shrink-0 text-(--color-muted)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-label={c.label}
                    onClick={() =>
                      setEditCategoryColor((cur) => (cur === c.value ? null : c.value))
                    }
                    className={[
                      "h-5 w-5 shrink-0 rounded-full transition",
                      editCategoryColor === c.value
                        ? "ring-2 ring-(--color-accent) ring-offset-1"
                        : "",
                    ].join(" ")}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
                {editCategoryColor && (
                  <input
                    value={editCategoryLabel}
                    onChange={(e) => setEditCategoryLabel(e.target.value)}
                    maxLength={20}
                    placeholder="카테고리 이름"
                    className="min-w-0 flex-1 rounded border border-(--color-border) bg-transparent px-2 py-1 text-xs text-(--color-ink) outline-none"
                  />
                )}
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={handlePillClick}
              onPointerDown={handlePressStart}
              onPointerUp={handlePressEnd}
              onPointerLeave={handlePressEnd}
              onPointerCancel={handlePressEnd}
              onContextMenu={(e) => e.preventDefault()}
              style={{ WebkitTouchCallout: "none" }}
              className="flex min-w-0 flex-1 select-none items-center gap-2 text-left text-[15px] leading-snug text-(--color-ink)"
            >
              {todo.categoryColor && (
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: todo.categoryColor }}
                />
              )}
              <span className="min-w-0 flex-1">{todo.text}</span>
              {todo.categoryLabel && (
                <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-(--color-muted)">
                  {todo.categoryLabel}
                </span>
              )}
            </button>
          )}
        </div>

        {!editing && onEdit && (
          <button
            type="button"
            aria-label="수정"
            onClick={startEdit}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-(--color-muted) transition hover:bg-black/5"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}

        {!isReply && !editing && onReply && (
          <button
            type="button"
            aria-label="답장"
            onClick={() => setReplying((v) => !v)}
            className={[
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition",
              replying
                ? "bg-(--color-accent)/15 text-(--color-accent-dark)"
                : "text-(--color-muted) hover:bg-black/5",
            ].join(" ")}
          >
            <CornerDownRight className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          aria-label="삭제"
          onClick={() =>
            pendingDelete ? onDelete(todo.id) : setPendingDelete(true)
          }
          onBlur={() => setPendingDelete(false)}
          className={[
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-(--color-muted) transition",
            pendingDelete ? "bg-red-100 text-red-500" : "hover:bg-black/5",
          ].join(" ")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {replying && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitReply();
          }}
          className="ml-11 flex items-center gap-2"
        >
          <input
            autoFocus
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            maxLength={200}
            placeholder="답장을 입력하세요"
            className="glass min-w-0 flex-1 rounded-full border border-(--color-border) bg-(--color-pill-time) px-4 py-2 text-sm text-(--color-ink) outline-none focus:border-(--color-accent)"
          />
          <button
            type="submit"
            disabled={!replyText.trim() || sending}
            style={{ backgroundImage: "var(--gradient-accent)" }}
            className="shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold text-(--color-accent-ink) transition disabled:opacity-40"
          >
            보내기
          </button>
        </form>
      )}

      {replies.length > 0 && (
        <div className="ml-11 flex flex-col gap-2 border-l-2 border-(--color-border) pl-3">
          {replies.map((reply) => (
            <TodoItem
              key={reply.id}
              todo={reply}
              onDelete={onDelete}
              onEdit={onEdit}
              isReply
            />
          ))}
        </div>
      )}

      {previewOpen && todo.imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
          <img
            src={todo.imageUrl}
            alt=""
            className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-xl"
          />
        </div>
      )}
    </div>
  );
}
