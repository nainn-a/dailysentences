import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { del, list, put } from "@vercel/blob";

import type { ImageDTO } from "@/lib/types";
import { MAX_IMAGE_BYTES } from "@/lib/image-limits";

// Storage backend picks itself automatically, same pattern as store.ts:
//  - Vercel Blob when a store is connected — this is what you get for free
//    by adding the "Blob" storage integration in the Vercel dashboard
//    (Storage tab → Create Database → Connect to Project). Needed for
//    persistence on Vercel, since serverless functions don't have a
//    durable local disk. Two ways @vercel/blob authenticates, both
//    handled automatically by the SDK itself — this just has to detect
//    which one applies:
//      - Newer connected stores only inject BLOB_STORE_ID (no copyable
//        token in the dashboard); the SDK pairs it with the OIDC token
//        Vercel injects into every deployment at runtime.
//      - Older stores / a manually-added token inject BLOB_READ_WRITE_TOKEN
//        directly.
//  - Local files under data/images/ otherwise — zero setup for local dev,
//    or for any always-on host where the local disk does persist. Served
//    back out through /api/images/file/[filename].

const BLOB_PREFIX = "dailysentences-images/";
const DATA_DIR = path.join(process.cwd(), "data", "images");

export { MAX_IMAGE_BYTES };

function hasBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

// Exposed so the API route can tell "Blob looks connected but the actual
// call still failed" apart from "Blob was never connected at all" — the
// BLOB_STORE_ID (OIDC) path can be configured but still fail at request
// time if OIDC Federation isn't turned on for the project, unlike
// BLOB_READ_WRITE_TOKEN which either works or was never set.
export { hasBlob as isBlobConfigured };

function extensionFor(file: File): string {
  const fromType = file.type.split("/")[1];
  const fromName = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  const ext = (fromType || fromName || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext || "bin";
}

export async function listImages(): Promise<ImageDTO[]> {
  if (hasBlob()) {
    const { blobs } = await list({ prefix: BLOB_PREFIX });
    return blobs
      .map((b) => ({ id: b.pathname, url: b.url, uploadedAt: b.uploadedAt.toISOString() }))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  await mkdir(DATA_DIR, { recursive: true });
  const files = await readdir(DATA_DIR).catch(() => []);
  const withStats = await Promise.all(
    files.map(async (name) => {
      const info = await stat(path.join(DATA_DIR, name));
      return {
        id: name,
        url: `/api/images/file/${encodeURIComponent(name)}`,
        uploadedAt: info.mtime.toISOString(),
      };
    }),
  );
  return withStats.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function saveImage(file: File): Promise<ImageDTO> {
  const filename = `${randomUUID()}.${extensionFor(file)}`;

  if (hasBlob()) {
    const blob = await put(`${BLOB_PREFIX}${filename}`, file, {
      access: "public",
      contentType: file.type || undefined,
    });
    return { id: blob.pathname, url: blob.url, uploadedAt: new Date().toISOString() };
  }

  await mkdir(DATA_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(DATA_DIR, filename), buffer);
  return {
    id: filename,
    url: `/api/images/file/${encodeURIComponent(filename)}`,
    uploadedAt: new Date().toISOString(),
  };
}

export async function deleteImage(id: string): Promise<void> {
  if (hasBlob()) {
    await del(id);
    return;
  }
  await unlink(path.join(DATA_DIR, id)).catch(() => {});
}
