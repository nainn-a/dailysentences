"use client";

import { useState } from "react";
import { CornerDownRight, X } from "lucide-react";

import type { TodoDTO } from "@/lib/types";

export default function TodoItem({
  todo,
  replies = [],
  onToggle,
  onDelete,
  onReply,
  isReply = false,
}: {
  todo: TodoDTO;
  replies?: TodoDTO[];
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onReply?: (parentId: string, text: string) => Promise<boolean>;
  isReply?: boolean;
}) {
  const [pendingDelete, setPendingDelete] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

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

  return (
    <div className="flex flex-col gap-2">
      <div className="group flex items-center gap-3">
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

          <button
            type="button"
            onClick={() => onToggle(todo.id, !todo.done)}
            className={[
              "min-w-0 flex-1 text-left text-[15px] leading-snug",
              todo.done ? "text-(--color-muted) line-through" : "text-(--color-ink)",
            ].join(" ")}
          >
            {todo.text}
          </button>
        </div>

        {!isReply && onReply && (
          <button
            type="button"
            aria-label="답장"
            onClick={() => setReplying((v) => !v)}
            className={[
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition",
              replying
                ? "bg-(--color-accent)/15 text-(--color-accent-dark) opacity-100"
                : "text-(--color-muted) opacity-0 hover:bg-black/5 group-hover:opacity-100 focus-visible:opacity-100",
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
            pendingDelete
              ? "bg-red-100 text-red-500 opacity-100"
              : "opacity-0 hover:bg-black/5 group-hover:opacity-100 focus-visible:opacity-100",
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
            <TodoItem key={reply.id} todo={reply} onToggle={onToggle} onDelete={onDelete} isReply />
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
