"use client";

import { useEffect, useRef, useState } from "react";
import { ClipboardPaste, ImagePlus, Plus, X } from "lucide-react";

import { randomPastelColor, type Category } from "@/lib/categories";
import { formatNowTime } from "@/lib/date";
import { compressImageIfNeeded } from "@/lib/image-compress";
import { MAX_IMAGE_BYTES } from "@/lib/image-limits";
import type { ImageDTO } from "@/lib/types";

export default function AddTodoSheet({
  dateLabel,
  onClose,
  onSubmit,
}: {
  dateLabel: string;
  onClose: () => void;
  onSubmit: (
    text: string,
    time: string,
    image?: { id: string; url: string },
    category?: { color: string },
  ) => void;
}) {
  const [text, setText] = useState("");
  const [time, setTime] = useState(formatNowTime());
  const [image, setImage] = useState<ImageDTO | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryColor, setCategoryColor] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryColor, setNewCategoryColor] = useState(randomPastelColor);
  const [newCategoryName, setNewCategoryName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Submitting hands the uploaded image off to the memo — skip the
  // clean-up-on-close for it once that happens.
  const submittedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), 4000);
    return () => window.clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories ?? []);
      }
    })();
  }, []);

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
      setCategoryColor(newCategoryColor);
      setNewCategoryName("");
      setAddingCategory(false);
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "카테고리를 추가하지 못했어요.");
    }
  }

  // Closing (Escape, backdrop tap, 취소) without submitting shouldn't leave
  // an orphaned upload sitting in storage.
  useEffect(() => {
    return () => {
      if (!submittedRef.current && image) {
        fetch(`/api/images?id=${encodeURIComponent(image.id)}`, { method: "DELETE" }).catch(
          () => {},
        );
      }
    };
  }, [image]);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 첨부할 수 있어요.");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const upload = await compressImageIfNeeded(file, MAX_IMAGE_BYTES);
      const form = new FormData();
      form.append("file", upload);
      const res = await fetch("/api/images", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        setImage(data.image);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "이미지 업로드에 실패했어요.");
      }
    } catch {
      setError("이미지 업로드에 실패했어요.");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePaste(e: React.ClipboardEvent<HTMLFormElement>) {
    if (image || uploading) return;
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    const file = item?.getAsFile();
    if (!file) return;
    e.preventDefault();
    handleFile(file);
  }

  // Ctrl+V only fires a paste event while a text field has focus, so on
  // mobile (no keyboard shortcut, and this sheet has nothing to long-press
  // for the OS "붙여넣기" menu outside the text input) it often never
  // triggers. This button reads the clipboard directly on tap instead.
  async function pasteFromClipboard() {
    if (image || uploading) return;
    if (!navigator.clipboard?.read) {
      setError("이 브라우저에서는 지원하지 않아요. 사진 추가 버튼을 이용해주세요.");
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (!type) continue;
        const blob = await item.getType(type);
        await handleFile(new File([blob], "clipboard-image", { type }));
        return;
      }
      setError("클립보드에 복사된 사진이 없어요.");
    } catch {
      setError("클립보드를 읽을 수 없었어요. 사진을 다시 복사해보세요.");
    }
  }

  async function handleRemoveImage() {
    if (!image) return;
    const removed = image;
    setImage(null);
    await fetch(`/api/images?id=${encodeURIComponent(removed.id)}`, { method: "DELETE" }).catch(
      () => {},
    );
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    submittedRef.current = true;
    onSubmit(
      trimmed,
      time,
      image ? { id: image.id, url: image.url } : undefined,
      categoryColor ? { color: categoryColor } : undefined,
    );
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
          onPaste={handlePaste}
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

          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((c) => (
                <button
                  key={c.color}
                  type="button"
                  aria-label={c.name}
                  title={c.name}
                  onClick={() => setCategoryColor((cur) => (cur === c.color ? null : c.color))}
                  className={[
                    "h-6 w-6 shrink-0 rounded-full transition",
                    categoryColor === c.color ? "ring-2 ring-(--color-accent) ring-offset-2" : "",
                  ].join(" ")}
                  style={{ backgroundColor: c.color }}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  setNewCategoryColor(randomPastelColor());
                  setAddingCategory((v) => !v);
                }}
                aria-label="카테고리 추가"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-(--color-border) text-(--color-muted) transition hover:border-(--color-accent) hover:text-(--color-accent-dark)"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {addingCategory && (
              <div className="flex items-center gap-2 rounded-xl border border-(--color-border) bg-white px-3 py-2">
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

            {categoryColor && (
              <p className="text-xs text-(--color-muted)">
                선택된 카테고리:{" "}
                <span className="font-medium text-(--color-ink)">
                  {categories.find((c) => c.color === categoryColor)?.name ?? categoryColor}
                </span>
              </p>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {image ? (
            <div className="relative w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded image from Blob/local API, not a static build asset */}
              <img
                src={image.url}
                alt=""
                className="h-20 w-20 rounded-xl border border-(--color-border) object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                aria-label="사진 제거"
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-(--color-border) px-3 py-1.5 text-xs font-medium text-(--color-muted) transition hover:border-(--color-accent) hover:text-(--color-accent-dark) disabled:opacity-50"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                {uploading ? "업로드 중…" : "사진 추가"}
              </button>
              <button
                type="button"
                onClick={pasteFromClipboard}
                disabled={uploading}
                className="flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-(--color-border) px-3 py-1.5 text-xs font-medium text-(--color-muted) transition hover:border-(--color-accent) hover:text-(--color-accent-dark) disabled:opacity-50"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                붙여넣기
              </button>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

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
              disabled={!text.trim() || uploading}
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
