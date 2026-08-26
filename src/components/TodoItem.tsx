"use client";

import { useState } from "react";
import { X } from "lucide-react";

import type { TodoDTO } from "@/lib/types";

export default function TodoItem({
  todo,
  onToggle,
  onDelete,
}: {
  todo: TodoDTO;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
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
