import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";

import {
  DEFAULT_CATEGORIES,
  HEX_COLOR_RE,
  MAX_CATEGORIES,
  MAX_CATEGORY_NAME_LENGTH,
  type Category,
} from "@/lib/categories";

// The full set of memo categories a user has — color *and* name are stored
// together now (previously the palette was a fixed constant and only the
// name was stored separately; see category-name-store.ts, migrated below).
// Same auto-detect backend pattern as the other stores.

const REDIS_KEY = "dailysentences:categories";
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "categories.json");

// Superseded by this file, but read once on first-ever load so a name
// already customized there (e.g. before this feature existed) isn't lost.
const LEGACY_REDIS_KEY = "dailysentences:category-names";
const LEGACY_DATA_FILE = path.join(DATA_DIR, "category-names.json");

export { MAX_CATEGORY_NAME_LENGTH, MAX_CATEGORIES };
export type { Category };

type MutationResult =
  | { ok: true; categories: Category[] }
  | { ok: false; error: string };

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

async function readAll(): Promise<Category[] | null> {
  const redis = getRedis();
  if (redis) {
    const data = await redis.get<Category[]>(REDIS_KEY);
    return data ?? null;
  }

  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as Category[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

async function writeAll(categories: Category[]): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(REDIS_KEY, categories);
    return;
  }

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(categories, null, 2), "utf8");
}

async function readLegacyNames(): Promise<Record<string, string>> {
  const redis = getRedis();
  try {
    if (redis) return (await redis.get<Record<string, string>>(LEGACY_REDIS_KEY)) ?? {};
    const raw = await readFile(LEGACY_DATA_FILE, "utf8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

// Never-initialized (readAll() returned null) -> seed with the original
// palette, folding in any name already customized under the old
// category-name-store so that isn't silently lost.
async function readAllSeeded(): Promise<Category[]> {
  const existing = await readAll();
  if (existing) return existing;

  const legacyNames = await readLegacyNames();
  const seeded = DEFAULT_CATEGORIES.map((c) => ({
    color: c.color,
    name: legacyNames[c.color] || c.name,
  }));
  await writeAll(seeded);
  return seeded;
}

export function getCategories(): Promise<Category[]> {
  return enqueue(() => readAllSeeded());
}

export function isKnownCategoryColor(color: string): Promise<boolean> {
  return enqueue(async () => {
    const all = await readAllSeeded();
    return all.some((c) => c.color === color.toLowerCase());
  });
}

export function addCategory(color: string, name: string): Promise<MutationResult> {
  return enqueue(async () => {
    const normalized = color.toLowerCase();
    if (!HEX_COLOR_RE.test(normalized)) {
      return { ok: false, error: "색상 형식이 올바르지 않아요." };
    }
    const trimmedName = name.trim().slice(0, MAX_CATEGORY_NAME_LENGTH);
    if (!trimmedName) {
      return { ok: false, error: "이름을 입력해주세요." };
    }
    const all = await readAllSeeded();
    if (all.some((c) => c.color === normalized)) {
      return { ok: false, error: "이미 있는 색상이에요." };
    }
    if (all.length >= MAX_CATEGORIES) {
      return { ok: false, error: `카테고리는 최대 ${MAX_CATEGORIES}개까지 만들 수 있어요.` };
    }
    const next = [...all, { color: normalized, name: trimmedName }];
    await writeAll(next);
    return { ok: true, categories: next };
  });
}

export function renameCategory(color: string, name: string): Promise<MutationResult> {
  return enqueue(async () => {
    const normalized = color.toLowerCase();
    const trimmedName = name.trim().slice(0, MAX_CATEGORY_NAME_LENGTH);
    if (!trimmedName) {
      return { ok: false, error: "이름을 입력해주세요." };
    }
    const all = await readAllSeeded();
    if (!all.some((c) => c.color === normalized)) {
      return { ok: false, error: "카테고리를 찾을 수 없어요." };
    }
    const next = all.map((c) => (c.color === normalized ? { ...c, name: trimmedName } : c));
    await writeAll(next);
    return { ok: true, categories: next };
  });
}

export function removeCategory(color: string): Promise<Category[]> {
  return enqueue(async () => {
    const normalized = color.toLowerCase();
    const all = await readAllSeeded();
    const next = all.filter((c) => c.color !== normalized);
    await writeAll(next);
    return next;
  });
}
