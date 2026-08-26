import AppShell from "@/components/AppShell";
import ImageGallery from "@/components/ImageGallery";

export default function ImagePage() {
  // Reaching this page at all means the proxy already validated the
  // password cookie — no per-user account system to look up here.
  return (
    <AppShell>
      <ImageGallery />
    </AppShell>
  );
}
