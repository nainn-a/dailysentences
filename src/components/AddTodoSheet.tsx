"use client";

import { useEffect, useRef, useState } from "react";

import { formatNowTime } from "@/lib/date";

export default function AddTodoSheet({
  dateLabel,
  onClose,
  onSubmit,
}: {
  dateLabel: string;
  onClose: () => void;
  onSubmit: (text: string, time: string) => void;
}) {
  const [text, setText] = useState("");
  const [time, setTime] = useState(formatNowTime());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed, time);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0"
      />

      <div className="glass relative w-full max-w-md rounded-t-3xl bg-(--color-surface-strong) p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-xl sm:rounded-3xl sm:pb-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-(--color-border) sm:hidden" />

        <h2 className="text-sm font-medium text-(--color-muted)">{dateLabel}</h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mt-3 flex flex-col gap-3"
        >
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            placeholder="할 일이나 메모를 입력하세요"
            className="w-full rounded-xl border border-(--color-border) bg-white px-4 py-3 text-[15px] text-(--color-ink) outline-none focus:border-(--color-accent)"
          />

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-(--color-muted)">시간</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-lg border border-(--color-border) bg-white px-3 py-1.5 text-sm text-(--color-ink) outline-none focus:border-(--color-accent)"
            />
          </div>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-black/5 px-4 py-2.5 text-sm font-medium text-(--color-ink)"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              style={{ backgroundImage: "var(--gradient-accent)" }}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-(--color-accent-ink) transition hover:brightness-105 disabled:opacity-40"
            >
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
