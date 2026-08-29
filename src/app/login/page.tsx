"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "비밀번호가 올바르지 않습니다.");
        setLoading(false);
        return;
      }
      const callbackUrl = searchParams.get("callbackUrl") || "/calendar";
      router.replace(callbackUrl);
      router.refresh();
    } catch {
      setError("로그인 중 문제가 발생했어요. 다시 시도해주세요.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 px-6 py-16">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex items-center gap-1.5 rounded-full border border-(--color-border) bg-(--color-surface) px-3 py-1 text-[11px] font-medium tracking-wide text-(--color-muted)">
          <span
            aria-hidden
            style={{ backgroundImage: "var(--gradient-accent)" }}
            className="h-1.5 w-1.5 rounded-full"
          />
          매일을 기록하는 하루
        </span>
        <h1 className="font-display text-6xl leading-[0.95] text-(--color-ink) sm:text-7xl">
          DAILY
          <br />
          SENTENCES
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
        <div className="flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface) px-4 py-3 shadow-sm focus-within:border-(--color-accent)">
          <KeyRound className="h-4 w-4 shrink-0 text-(--color-muted)" />
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="w-full bg-transparent text-sm text-(--color-ink) outline-none"
          />
        </div>

        {error && <p className="text-center text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          style={{ backgroundImage: "var(--gradient-accent-glossy)" }}
          className="rounded-full px-6 py-3 text-sm font-semibold text-(--color-accent-ink) shadow-sm transition hover:brightness-105 active:scale-[0.98] disabled:opacity-40"
        >
          {loading ? "확인 중…" : "입장하기"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
