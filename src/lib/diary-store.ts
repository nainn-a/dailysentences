import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";

import { deleteImage } from "@/lib/image-store";
import type { DiaryDTO, DiaryImage } from "@/lib/types";

// One long-form journal entry per date, keyed by "YYYY-MM-DD" — separate
// from the memo pills in store.ts. Same auto-detect backend pattern:
// Redis (Upstash) when available, else a local JSON file.

const REDIS_KEY = "dailysentences:diary";
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "diary.json");

export const MAX_DIARY_LENGTH = 20000;

let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const hasEnv = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  redisClient = hasEnv ? Redis.fromEnv() : null;
  return redisClient;
}

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn, fn);
  queue = result.catch(() => {});
  return result;
}

async function readAll(): Promise<Record<string, DiaryDTO>> {
  const redis = getRedis();
  if (redis) {
    const data = await redis.get<Record<string, DiaryDTO>>(REDIS_KEY);
    return data ?? {};
  }

  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as Record<string, DiaryDTO>;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
}

async function writeAll(all: Record<string, DiaryDTO>): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(REDIS_KEY, all);
    return;
  }

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(all, null, 2), "utf8");
}

export function getDiary(date: string): Promise<DiaryDTO | null> {
  return enqueue(async () => {
    const all = await readAll();
    return all[date] ?? null;
  });
}

export function saveDiary(
  date: string,
  content: string,
  images: DiaryImage[],
): Promise<DiaryDTO> {
  return enqueue(async () => {
    const all = await readAll();
    const previousImages = all[date]?.images ?? [];

    const entry: DiaryDTO = { date, content, images, updatedAt: new Date().toISOString() };
    all[date] = entry;
    await writeAll(all);

    // Any image that was attached before but isn't in the new list was
    // removed by the editor — clean it up (best-effort).
    const keptIds = new Set(images.map((img) => img.id));
    await Promise.all(
      previousImages
        .filter((img) => !keptIds.has(img.id))
        .map((img) => deleteImage(img.id).catch(() => {})),
    );

    return entry;
  });
}
