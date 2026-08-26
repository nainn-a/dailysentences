"use client";

import { usePathname, useRouter } from "next/navigation";

import { BottomNav, SideRail, type NavKey } from "@/components/NavRail";

const PATH_TO_NAV_KEY: Record<string, NavKey> = {
  "/calendar": "calendar",
  "/image": "image",
};

/** Shared frame (side rail + bottom tab bar) for every logged-in page. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const active = PATH_TO_NAV_KEY[pathname] ?? "calendar";

  function handleSelect(key: NavKey) {
    router.push(`/${key}`);
  }

  return (
    <div className="flex h-dvh min-h-dvh">
      <SideRail active={active} onSelect={handleSelect} />

      <div className="flex min-w-0 flex-1 flex-col">
        {children}

        <BottomNav active={active} onSelect={handleSelect} />
      </div>
    </div>
  );
}
