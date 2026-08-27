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

export function listByDate(date: string): Promise<TodoDTO[]> {
  return enqueue(async () => {
    const all = await readAll();
    return all
      .filter((t) => t.date === date)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
}

// Every memo tagged with this category color, across every date — plus
// their replies for context (a reply can't carry its own category; see
// TodoItem). Used by the standalone 카테고리 tab, sorted most-recent-day
// first rather than createdAt, since browsing is date-oriented there.
export function listByCategory(color: string): Promise<TodoDTO[]> {
  return enqueue(async () => {
    const all = await readAll();
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
    const all = await readAll();
    const counts: Record<string, number> = {};
    for (const t of all) {
      if (t.date >= start && t.date <= end) {
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
    const all = await readAll();
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
    const all = await readAll();
    const todo = all.find((t) => t.id === id && t.date === date);
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
    const all = await readAll();
    const idx = all.findIndex((t) => t.id === id);
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

export function remove(id: string): Promise<boolean> {
  return enqueue(async () => {
    const all = await readAll();
    // Deleting a memo takes its replies (one level, no threads-of-threads)
    // down with it.
    const removed = all.filter((t) => t.id === id || t.parentId === id);
    if (removed.length === 0) return false;
    const removedIds = new Set(removed.map((t) => t.id));
    const next = all.filter((t) => !removedIds.has(t.id));
    await writeAll(next);
    // Best-effort — a stuck blob doesn't need to block the memo delete.
    await Promise.all(
      removed
        .filter((t) => t.imageId)
        .map((t) => deleteImage(t.imageId!).catch(() => {})),
    );
    return true;
  });
}
