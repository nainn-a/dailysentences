"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CornerDownRight, Pencil, X } from "lucide-react";

import type { Category } from "@/lib/categories";
import type { TodoDTO } from "@/lib/types";

const LONG_PRESS_MS = 500;
// A second tap inside this window counts as a double-click; past it, the
// first tap's delayed edit fires on its own.
const DOUBLE_CLICK_MS = 300;

export default function TodoItem({
  todo,
  replies = [],
  categories = [],
  onDelete,
  onEdit,
  onToggleDone,
  onReply,
  isReply = false,
}: {
  todo: TodoDTO;
  replies?: TodoDTO[];
  // The user's full category list ({ color, name }), for the swatch picker
  // and the name chip shown next to a categorized memo's text.
  categories?: Category[];
  onDelete: (id: string) => void;
  onEdit?: (id: string, text: string, category: { color: string | null }) => void;
  onToggleDone?: (id: string) => void;
  onReply?: (parentId: string, text: string) => Promise<boolean>;
  isReply?: boolean;
}) {
  const [pendingDelete, setPendingDelete] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [editCategoryColor, setEditCategoryColor] = useState<string | null>(
    todo.categoryColor ?? null,
  );
  const pressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const clickTimerRef = useRef<number | null>(null);
  const copiedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pressTimerRef.current !== null) window.clearTimeout(pressTimerRef.current);
      if (clickTimerRef.current !== null) window.clearTimeout(clickTimerRef.current);
      if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current);
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
    setEditing(true);
  }

  function submitEdit() {
    const trimmed = editText.trim();
    if (trimmed) {
      onEdit?.(todo.id, trimmed, { color: editCategoryColor });
    }
    setEditing(false);
  }

  function clearPressTimer() {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }

  async function copyMemo() {
    try {
      await navigator.clipboard.writeText(todo.text);
    } catch {
      return;
    }
    if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current);
    setCopied(true);
    copiedTimerRef.current = window.setTimeout(() => {
      copiedTimerRef.current = null;
      setCopied(false);
    }, 1200);
  }

  function handlePressStart() {
    longPressFiredRef.current = false;
    clearPressTimer();
    pressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
      copyMemo();
    }, LONG_PRESS_MS);
  }

  function handlePressEnd() {
    clearPressTimer();
  }

  // One tap edits; two quick taps toggle the strikethrough (done) instead —
  // held apart by a short delay so the second tap has a chance to arrive.
  // Press-and-hold (above) copies the memo text, and wins over both if it
  // fires first.
  function handlePillClick() {
    if (longPressFiredRef.current) {
      // Swallow the click that follows a long-press copy.
      longPressFiredRef.current = false;
      return;
    }
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      onToggleDone?.(todo.id);
      return;
    }
    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null;
      startEdit();
    }, DOUBLE_CLICK_MS);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 sm:gap-3">
        <span className="hidden w-11 shrink-0 text-right text-xs tabular-nums text-(--color-muted) sm:block">
          {todo.time}
        </span>

        <div className="relative flex min-w-0 flex-1 items-center gap-3 rounded-none border border-(--color-border) bg-(--color-pill) px-3 py-3 transition sm:px-4">
          {copied && (
            <span
              aria-live="polite"
              className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-2.5 py-1 text-[11px] whitespace-nowrap text-white shadow"
            >
              복사됨
            </span>
          )}
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

              {/* Replies can't carry their own category — keeps "browse by
                  category" simple: a color always belongs to a top-level
                  memo, never to a comment on one. */}
              {!isReply && (
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {categories.map((c) => (
                      <button
                        key={c.color}
                        type="button"
                        aria-label={c.name}
                        title={c.name}
                        onClick={() =>
                          setEditCategoryColor((cur) => (cur === c.color ? null : c.color))
                        }
                        className={[
                          "h-5 w-5 shrink-0 rounded-full transition",
                          editCategoryColor === c.color
                            ? "ring-2 ring-(--color-accent) ring-offset-1"
                            : "",
                        ].join(" ")}
                        style={{ backgroundColor: c.color }}
                      />
                    ))}
                  </div>
                  {editCategoryColor && (
                    <p className="text-[11px] text-(--color-muted)">
                      선택된 카테고리:{" "}
                      <span className="font-medium text-(--color-ink)">
                        {categories.find((c) => c.color === editCategoryColor)?.name ??
                          editCategoryColor}
                      </span>
                    </p>
                  )}
                </div>
              )}
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
              {/* The time column to the left of the pill (below) is hidden on
                  phones to give the text more room — shown inline here
                  instead, at the same narrow width. */}
              <span className="shrink-0 text-xs tabular-nums text-(--color-muted) sm:hidden">
                {todo.time}
              </span>
              {todo.categoryColor && (
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: todo.categoryColor }}
                />
              )}
              <span
                className={[
                  "min-w-0 flex-1",
                  todo.done ? "text-(--color-muted) line-through" : "",
                ].join(" ")}
              >
                {todo.text}
              </span>
              {todo.categoryColor &&
                (() => {
                  const name = categories.find((c) => c.color === todo.categoryColor)?.name;
                  return name ? (
                    <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-(--color-muted)">
                      {name}
                    </span>
                  ) : null;
                })()}
            </button>
          )}
        </div>

        {!editing && onEdit && (
          <button
            type="button"
            aria-label="수정"
            onClick={startEdit}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-(--color-muted) transition hover:bg-black/5 sm:h-7 sm:w-7"
          >
            <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        )}

        {!isReply && !editing && onReply && (
          <button
            type="button"
            aria-label="답장"
            onClick={() => setReplying((v) => !v)}
            className={[
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition sm:h-7 sm:w-7",
              replying
                ? "bg-(--color-accent)/15 text-(--color-accent-dark)"
                : "text-(--color-muted) hover:bg-black/5",
            ].join(" ")}
          >
            <CornerDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-(--color-muted) transition sm:h-7 sm:w-7",
            pendingDelete ? "bg-red-100 text-red-500" : "hover:bg-black/5",
          ].join(" ")}
        >
          <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
            className="min-w-0 flex-1 rounded-full border border-(--color-border) bg-(--color-pill-time) px-4 py-2 text-sm text-(--color-ink) outline-none focus:border-(--color-accent)"
          />
          <button
            type="submit"
            disabled={!replyText.trim() || sending}
            style={{ backgroundImage: "var(--gradient-accent-glossy)" }}
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
              onToggleDone={onToggleDone}
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
