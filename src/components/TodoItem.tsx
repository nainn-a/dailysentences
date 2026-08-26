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

  return (
    <div className="group flex items-center gap-3">
      <span className="w-11 shrink-0 text-right text-xs tabular-nums text-(--color-muted)">
        {todo.time}
      </span>

      <button
        type="button"
        onClick={() => onToggle(todo.id, !todo.done)}
        className={[
          "min-w-0 flex-1 rounded-2xl bg-(--color-pill) px-4 py-3 text-left text-[15px] leading-snug shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition",
          todo.done ? "text-(--color-muted) line-through" : "text-(--color-ink)",
        ].join(" ")}
      >
        {todo.text}
      </button>

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
  );
}
