import AppShell from "@/components/AppShell";
import CategoryBrowser from "@/components/CategoryBrowser";

export default function CategoryPage() {
  // Reaching this page at all means the proxy already validated the
  // password cookie — no per-user account system to look up here.
  return (
    <AppShell>
      <CategoryBrowser />
    </AppShell>
  );
}
