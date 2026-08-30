"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, LogOut, Plus } from "lucide-react";

import { compressImageIfNeeded } from "@/lib/image-compress";
import { MAX_IMAGE_BYTES } from "@/lib/image-limits";
import type { ImageDTO } from "@/lib/types";

export default function ImageGallery() {
  const router = useRouter();
  const [images, setImages] = useState<ImageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<ImageDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImages = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/images");
    if (res.ok) {
      const data = await res.json();
      setImages(data.images ?? []);
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "이미지 목록을 불러오지 못했어요.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch, not derived state
    loadImages();
  }, [loadImages]);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), 4000);
    return () => window.clearTimeout(timer);
  }, [error]);

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          if (!file.type.startsWith("image/")) {
            setError("이미지 파일만 업로드할 수 있어요.");
            continue;
          }
          const upload = await compressImageIfNeeded(file, MAX_IMAGE_BYTES);
          const form = new FormData();
          form.append("file", upload);
          const res = await fetch("/api/images", { method: "POST", body: form });
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            setError(data?.error ?? "업로드에 실패했어요.");
            break;
          }
        }
      } catch {
        setError("업로드에 실패했어요.");
      }
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadImages();
    },
    [loadImages],
  );

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (!file) return;
      e.preventDefault();
      handleFiles([file]);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFiles]);

  // Ctrl+V above only fires while something on the page is editable/focused
  // — this screen has no text field, so on mobile there's nothing to
  // long-press for the OS "붙여넣기" menu. This button reads the clipboard
  // directly on tap instead, which works on both desktop and mobile.
  async function pasteFromClipboard() {
    if (!navigator.clipboard?.read) {
      setError("이 브라우저에서는 지원하지 않아요. + 버튼을 이용해주세요.");
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (!type) continue;
        const blob = await item.getType(type);
        await handleFiles([new File([blob], "clipboard-image", { type })]);
        return;
      }
      setError("클립보드에 복사된 사진이 없어요.");
    } catch {
      setError("클립보드를 읽을 수 없었어요. 사진을 다시 복사해보세요.");
    }
  }

  async function handleDelete(id: string) {
    setPreview(null);
    setImages((prev) => prev.filter((img) => img.id !== id));
    await fetch(`/api/images?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between bg-(--color-panel) px-4 py-5 sm:px-6">
        <h1 className="font-display text-2xl text-(--color-panel-ink) sm:text-3xl">이미지</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLogout}
            aria-label="로그아웃"
            className="flex h-8 w-8 items-center justify-center rounded-full text-(--color-panel-muted) transition hover:bg-white/10 hover:text-(--color-panel-ink)"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="relative flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {loading ? (
          <p className="mt-10 text-center text-sm text-(--color-muted)">불러오는 중…</p>
        ) : images.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-(--color-muted)">아직 업로드한 이미지가 없어요.</p>
            <p className="text-xs text-(--color-muted)">
              오른쪽 아래 + 버튼으로 추가하거나, 붙여넣기 버튼으로 복사한 사진을 올려보세요.
            </p>
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {images.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setPreview(image)}
                className="aspect-square overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-pill)"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded image from Blob/local API, not a static build asset */}
                <img src={image.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="fixed bottom-24 right-5 flex flex-col items-end gap-3 md:bottom-8 md:right-8">
          <button
            type="button"
            onClick={pasteFromClipboard}
            disabled={uploading}
            aria-label="클립보드에서 붙여넣기"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-(--color-surface-strong) text-(--color-ink) shadow-lg transition hover:brightness-105 active:scale-95 disabled:opacity-50"
          >
            <ClipboardPaste className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="이미지 업로드"
            style={{ backgroundImage: "var(--gradient-accent-glossy)" }}
            className="flex h-14 w-14 items-center justify-center rounded-full text-(--color-accent-ink) shadow-lg transition hover:brightness-105 active:scale-95 disabled:opacity-50"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {(error || uploading) && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-xs text-white md:bottom-8">
            {error ?? "업로드 중…"}
          </div>
        )}
      </main>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative flex max-h-full max-w-full flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
            <img
              src={preview.url}
              alt=""
              className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-xl"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-(--color-ink)"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => handleDelete(preview.id)}
                className="rounded-full bg-red-500 px-5 py-2.5 text-sm font-medium text-white"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
