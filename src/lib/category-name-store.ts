import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";

// A fixed display name per category color (e.g. #ef4444 -> "업무"),
// separate from the free-text label typed on an individual memo — this is
// one name per color, shown wherever the color picker itself appears
// (currently just the 카테고리 tab). Same auto-detect backend pattern as
// the other stores.

export type CategoryNames = Record<string, string>;

const REDIS_KEY = "dailysentences:category-names";
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "category-names.json");

export const MAX_CATEGORY_NAME_LENGTH = 10;

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

async function readAll(): Promise<CategoryNames> {
  const redis = getRedis();
  if (redis) {
    const data = await redis.get<CategoryNames>(REDIS_KEY);
    return data ?? {};
  }

  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as CategoryNames;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
}

async function writeAll(names: CategoryNames): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(REDIS_KEY, names);
    return;
  }

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(names, null, 2), "utf8");
}

export function getCategoryNames(): Promise<CategoryNames> {
  return enqueue(() => readAll());
}

// Empty/whitespace-only `name` clears it back to the default color label.
export function setCategoryName(color: string, name: string): Promise<CategoryNames> {
  return enqueue(async () => {
    const all = await readAll();
    if (name) {
      all[color] = name;
    } else {
      delete all[color];
    }
    await writeAll(all);
    return all;
  });
}
