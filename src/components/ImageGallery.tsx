"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Plus } from "lucide-react";

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
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch, not derived state
    loadImages();
  }, [loadImages]);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), 2400);
    return () => window.clearTimeout(timer);
  }, [error]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        setError("이미지 파일만 업로드할 수 있어요.");
        continue;
      }
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/images", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "업로드에 실패했어요.");
        break;
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await loadImages();
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
      <header className="glass flex items-center justify-between border-b border-(--color-border) bg-(--color-surface) px-4 py-4 sm:px-6">
        <h1 className="text-xl font-semibold text-(--color-ink)">이미지</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLogout}
            aria-label="로그아웃"
            className="flex h-8 w-8 items-center justify-center rounded-full text-(--color-muted) transition hover:bg-black/5"
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
              오른쪽 아래 + 버튼으로 이미지를 추가해보세요.
            </p>
          </div>
        ) : (
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setPreview(image)}
                className="glass aspect-square overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-pill)"
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

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="이미지 업로드"
          style={{ backgroundImage: "var(--gradient-accent)" }}
          className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-full text-(--color-accent-ink) shadow-lg transition hover:brightness-105 active:scale-95 disabled:opacity-50 md:bottom-8 md:right-8"
        >
          <Plus className="h-6 w-6" />
        </button>

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
