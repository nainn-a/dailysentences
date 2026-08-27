"use client";

// Photos copied straight from the Camera app (or a paste from Photos) are
// routinely 3-8MB — well over the server's upload cap — while a plain
// screenshot usually isn't. Rather than reject those with an error the
// user has to notice and act on, shrink them client-side first so paste
// and upload just work.
const MAX_DIMENSION = 2000;
const QUALITY_STEPS = [0.85, 0.7, 0.55, 0.4];

export async function compressImageIfNeeded(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes) return file;
  // Re-encoding an animated GIF would flatten it to a single frame — leave
  // those alone and let the server-side size check handle it.
  if (file.type === "image/gif") return file;

  const source = await loadImageSource(file);
  if (!source) return file;

  const { width: srcWidth, height: srcHeight } = sourceSize(source);
  if (!srcWidth || !srcHeight) return file;

  const scale = Math.min(1, MAX_DIMENSION / Math.max(srcWidth, srcHeight));
  const width = Math.max(1, Math.round(srcWidth * scale));
  const height = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(source, 0, 0, width, height);

  const baseName = file.name.replace(/\.\w+$/, "") || "image";
  let smallest: Blob | null = null;
  for (const quality of QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, quality);
    if (!blob) continue;
    if (!smallest || blob.size < smallest.size) smallest = blob;
    if (blob.size <= maxBytes) {
      return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
    }
  }
  // Still over the cap even at the lowest quality — hand back the smallest
  // attempt anyway. The server's own check gives a clear error rather than
  // this failing silently.
  return smallest ? new File([smallest], `${baseName}.jpg`, { type: "image/jpeg" }) : file;
}

type ImageSource = ImageBitmap | HTMLImageElement;

function sourceSize(source: ImageSource): { width: number; height: number } {
  if (source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  return { width: source.width, height: source.height };
}

async function loadImageSource(file: File): Promise<ImageSource | null> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to the <img> based loader below.
    }
  }
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}
