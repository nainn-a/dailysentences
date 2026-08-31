import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Times New Roman leads the stack for Latin glyphs (it has no Hangul, so
// the browser falls through to Freesentation for Korean text automatically
// — no need to split the two scripts by hand).
const freesentation = localFont({
  src: [
    { path: "../fonts/Freesentation-4Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Freesentation-5Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Freesentation-6SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
});

// The login wordmark's face — reserved for that one screen, so it reads as
// the app's "cover".
const partialSans = localFont({
  src: "../fonts/PartialSansKR-Regular.otf",
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

// Every other page's title (캘린더/카테고리/이미지 headers, the month label)
// borrows this instead — a different face than the login screen, so the
// "cover" reads as distinct from the app's actual screens.
const cafe24 = localFont({
  src: "../fonts/Cafe24ProSlimMax.woff2",
  weight: "400",
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DAILY SENTENCES",
  description: "날짜별로 메모와 할 일을 남기는 캘린더 웹앱. Google 계정으로 로그인하세요.",
  icons: {
    // favicon.ico (src/app/favicon.ico) is picked up automatically by Next;
    // these cover the sizes it doesn't — the iOS home-screen icon and the
    // larger PNGs some Android/desktop install prompts ask for.
    apple: "/apple-touch-icon.png",
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // The navy header/side-rail color — tints the mobile browser chrome to
  // match instead of the old cream background this used to be set to.
  themeColor: "#0c1a2b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${freesentation.variable} ${partialSans.variable} ${cafe24.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-(--color-ink)">
        {children}
      </body>
    </html>
  );
}
