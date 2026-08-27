"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

import type { DiaryImage } from "@/lib/types";

type SaveStatus = "idle" | "saving" | "saved" | "error";
const AUTOSAVE_DELAY_MS = 1000;

export default function DiaryEditor({
  date,
  dateLabel,
}: {
  date: string;
  dateLabel: string;
}) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<DiaryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<number | null>(null);
  // Guards the freshly-loaded entry from immediately re-triggering a save.
  const readyRef = useRef(false);

  const load = useCallback(async (d: string) => {
    readyRef.current = false;
    setLoading(true);
    const res = await fetch(`/api/diary?date=${d}`);
    if (res.ok) {
      const data = await res.json();
      setContent(data.entry?.content ?? "");
      setImages(data.entry?.images ?? []);
    } else {
      setContent("");
      setImages([]);
    }
    setLoading(false);
    setStatus("idle");
    readyRef.current = true;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on date change, not derived state
    load(date);
  }, [date, load]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const save = useCallback(async (d: string, text: string, imgs: DiaryImage[]) => {
    setStatus("saving");
    const res = await fetch("/api/diary", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: d, content: text, images: imgs }),
    });
    setStatus(res.ok ? "saved" : "error");
  }, []);

  function handleContentChange(value: string) {
    setContent(value);
    if (!readyRef.current) return;
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      save(date, value, images);
    }, AUTOSAVE_DELAY_MS);
  }

  async function handleInsertImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 첨부할 수 있어요.");
      return;
    }
    setError(null);
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/images", { method: "POST", body: form });
    if (res.ok) {
      const data = await res.json();
      const nextImages = [...images, { id: data.image.id, url: data.image.url }];
      setImages(nextImages);
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
      await save(date, content, nextImages);
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "이미지 업로드에 실패했어요.");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    const file = item?.getAsFile();
    if (!file) return;
    e.preventDefault();
    handleInsertImage(file);
  }

  async function handleRemoveImage(id: string) {
    const nextImages = images.filter((img) => img.id !== id);
    setImages(nextImages);
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    await save(date, content, nextImages);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-(--color-muted)">{dateLabel} 일기</h2>
        <span className="text-xs text-(--color-muted)">
          {status === "saving"
            ? "저장 중…"
            : status === "saved"
              ? "저장됨"
              : status === "error"
                ? "저장 실패"
                : ""}
        </span>
      </div>

      {loading ? (
        <p className="mt-10 text-center text-sm text-(--color-muted)">불러오는 중…</p>
      ) : (
        <>
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onPaste={handlePaste}
            placeholder="오늘 하루는 어땠나요? 편하게 적어보세요…"
            className="glass min-h-[50vh] w-full resize-y rounded-2xl border border-(--color-border) bg-(--color-pill) p-4 text-[15px] leading-relaxed text-(--color-ink) outline-none focus:border-(--color-accent)"
          />

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square overflow-hidden rounded-xl border border-(--color-border)"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded image from Blob/local API, not a static build asset */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(img.id)}
                    aria-label="사진 제거"
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleInsertImage(e.target.files?.[0])}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-(--color-border) px-3 py-1.5 text-xs font-medium text-(--color-muted) transition hover:border-(--color-accent) hover:text-(--color-accent-dark) disabled:opacity-50"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {uploading ? "업로드 중…" : "이미지 삽입 (붙여넣기 가능)"}
          </button>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </>
      )}
    </div>
  );
}
