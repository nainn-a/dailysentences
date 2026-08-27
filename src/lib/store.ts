import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";

import { deleteImage } from "@/lib/image-store";
import type { TodoDTO } from "@/lib/types";

// Storage backend picks itself automatically:
//  - Redis (Upstash) when the env vars are present — this is what you get
//    for free by adding the "Redis" storage integration in the Vercel
//    dashboard (Storage tab → Create Database). Needed for persistence on
//    Vercel, since serverless functions don't have a durable local disk.
//  - A plain JSON file otherwise — zero setup for local dev, or for any
//    always-on host (a VM/container) where the local disk does persist.
// Every other function in this module is written against readAll/writeAll,
// so the rest of the app never has to know which backend is active.

const REDIS_KEY = "dailysentences:todos";
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "todos.json");

// How long a deleted memo stays recoverable in 휴지통 before it (and its
// attached photo) is actually erased.
const TRASH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const hasEnv =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  redisClient = hasEnv ? Redis.fromEnv() : null;
  return redisClient;
}

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn, fn);
  queue = result.catch(() => {});
  return result;
}

async function readAll(): Promise<TodoDTO[]> {
  const redis = getRedis();
  if (redis) {
    const data = await redis.get<TodoDTO[]>(REDIS_KEY);
    return data ?? [];
  }

  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as TodoDTO[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(todos: TodoDTO[]): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(REDIS_KEY, todos);
    return;
  }

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(todos, null, 2), "utf8");
}

// readAll(), but also permanently drops anything that's been sitting in
// 휴지통 past the retention window (and its photo with it) — a cheap,
// on-demand alternative to a cron job. Every public function below reads
// through this instead of readAll() directly.
async function readAllFresh(): Promise<TodoDTO[]> {
  const all = await readAll();
  const now = Date.now();
  const expired = all.filter(
    (t) => t.deletedAt && now - new Date(t.deletedAt).getTime() > TRASH_RETENTION_MS,
  );
  if (expired.length === 0) return all;

  const expiredIds = new Set(expired.map((t) => t.id));
  const kept = all.filter((t) => !expiredIds.has(t.id));
  await writeAll(kept);
  // Best-effort — a stuck blob doesn't need to block the purge.
  await Promise.all(
    expired.filter((t) => t.imageId).map((t) => deleteImage(t.imageId!).catch(() => {})),
  );
  return kept;
}

export function listByDate(date: string): Promise<TodoDTO[]> {
  return enqueue(async () => {
    const all = await readAllFresh();
    return all
      .filter((t) => t.date === date && !t.deletedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
}

// Currently-deleted memos, for the 휴지통 view. A reply swept away by its
// parent's own cascade delete is left out — restoring the parent brings it
// back automatically — but a reply deleted on its own is listed so it can
// be restored independently.
export function listTrash(): Promise<TodoDTO[]> {
  return enqueue(async () => {
    const all = await readAllFresh();
    return all
      .filter((t) => {
        if (!t.deletedAt) return false;
        if (!t.parentId) return true;
        const parent = all.find((p) => p.id === t.parentId);
        const sweptByParent = parent?.deletedAt === t.deletedAt;
        return !sweptByParent;
      })
      .sort((a, b) => (b.deletedAt as string).localeCompare(a.deletedAt as string));
  });
}

// Every memo tagged with this category color, across every date — plus
// their replies for context (a reply can't carry its own category; see
// TodoItem). Used by the standalone 카테고리 tab, sorted most-recent-day
// first rather than createdAt, since browsing is date-oriented there.
export function listByCategory(color: string): Promise<TodoDTO[]> {
  return enqueue(async () => {
    const all = (await readAllFresh()).filter((t) => !t.deletedAt);
    const matchingParentIds = new Set(
      all.filter((t) => !t.parentId && t.categoryColor === color).map((t) => t.id),
    );
    return all
      .filter((t) => matchingParentIds.has(t.id) || (t.parentId && matchingParentIds.has(t.parentId)))
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  });
}

export function countsBetween(start: string, end: string): Promise<Record<string, number>> {
  return enqueue(async () => {
    const all = await readAllFresh();
    const counts: Record<string, number> = {};
    for (const t of all) {
      if (!t.deletedAt && t.date >= start && t.date <= end) {
        counts[t.date] = (counts[t.date] ?? 0) + 1;
      }
    }
    return counts;
  });
}

export function create(input: {
  date: string;
  time: string;
  text: string;
  imageId?: string;
  imageUrl?: string;
  parentId?: string;
  categoryColor?: string;
}): Promise<TodoDTO> {
  return enqueue(async () => {
    const all = await readAllFresh();
    const todo: TodoDTO = {
      id: randomUUID(),
      date: input.date,
      time: input.time,
      text: input.text,
      done: false,
      createdAt: new Date().toISOString(),
      ...(input.imageId && input.imageUrl
        ? { imageId: input.imageId, imageUrl: input.imageUrl }
        : {}),
      ...(input.parentId ? { parentId: input.parentId } : {}),
      ...(input.categoryColor ? { categoryColor: input.categoryColor } : {}),
    };
    all.push(todo);
    await writeAll(all);
    return todo;
  });
}

// A memo one level deep — reachable from listByDate, but not itself a
// valid reply target (no threads-of-threads). Used by the API route to
// validate a reply's parentId before creating it.
export function findTopLevel(date: string, id: string): Promise<TodoDTO | null> {
  return enqueue(async () => {
    const all = await readAllFresh();
    const todo = all.find((t) => t.id === id && t.date === date && !t.deletedAt);
    return todo && !todo.parentId ? todo : null;
  });
}

export function update(
  id: string,
  patch: {
    done?: boolean;
    text?: string;
    // `null` clears the category (as opposed to `undefined`, which leaves
    // it untouched — same convention PATCH /api/todos/:id uses in its body).
    categoryColor?: string | null;
  },
): Promise<TodoDTO | null> {
  return enqueue(async () => {
    const all = await readAllFresh();
    const idx = all.findIndex((t) => t.id === id && !t.deletedAt);
    if (idx === -1) return null;

    const next: TodoDTO = { ...all[idx] };
    if (patch.done !== undefined) next.done = patch.done;
    if (patch.text !== undefined) next.text = patch.text;
    if (patch.categoryColor !== undefined) {
      if (patch.categoryColor === null) delete next.categoryColor;
      else next.categoryColor = patch.categoryColor;
    }

    all[idx] = next;
    await writeAll(all);
    return next;
  });
}

// Soft delete — marks the row (and, for a top-level memo, its still-live
// replies) with a shared deletedAt instead of erasing it, so a mistaken
// delete can be undone from 휴지통 within the retention window. The photo
// isn't touched here either; both are only actually erased once
// readAllFresh() purges the entry for good. See restore()/listTrash().
export function remove(id: string): Promise<boolean> {
  return enqueue(async () => {
    const all = await readAllFresh();
    const target = all.find((t) => t.id === id && !t.deletedAt);
    if (!target) return false;

    const deletedAt = new Date().toISOString();
    const next = all.map((t) =>
      t.id === id || (t.parentId === id && !t.deletedAt) ? { ...t, deletedAt } : t,
    );
    await writeAll(next);
    return true;
  });
}

// Undoes one remove() — clears deletedAt on the item, plus any reply that
// was cascade-deleted in that same call (matched by the shared deletedAt
// timestamp), without resurrecting replies removed independently before or
// after it.
export function restore(id: string): Promise<TodoDTO | null> {
  return enqueue(async () => {
    const all = await readAllFresh();
    const target = all.find((t) => t.id === id && t.deletedAt);
    if (!target) return null;

    const deletedAt = target.deletedAt;
    const next = all.map((t) => {
      if (t.id !== id && !(t.parentId === id && t.deletedAt === deletedAt)) return t;
      const restored = { ...t };
      delete restored.deletedAt;
      return restored;
    });
    await writeAll(next);
    return next.find((t) => t.id === id) ?? null;
  });
}
