import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";

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

export function create(input: { date: string; time: string; text: string }): Promise<TodoDTO> {
  return enqueue(async () => {
    const all = await readAll();
    const todo: TodoDTO = {
      id: randomUUID(),
      date: input.date,
      time: input.time,
      text: input.text,
      done: false,
      createdAt: new Date().toISOString(),
    };
    all.push(todo);
    await writeAll(all);
    return todo;
  });
}

export function update(
  id: string,
  patch: { done?: boolean; text?: string },
): Promise<TodoDTO | null> {
  return enqueue(async () => {
    const all = await readAll();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...patch };
    await writeAll(all);
    return all[idx];
  });
}

export function remove(id: string): Promise<boolean> {
  return enqueue(async () => {
    const all = await readAll();
    const next = all.filter((t) => t.id !== id);
    if (next.length === all.length) return false;
    await writeAll(next);
    return true;
  });
}
