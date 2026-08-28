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

export const metadata: Metadata = {
  title: "Daily Sentences",
  description: "날짜별로 메모와 할 일을 남기는 캘린더 웹앱. Google 계정으로 로그인하세요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f4f1ec",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${freesentation.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-(--color-ink)">
        {children}
      </body>
    </html>
  );
}
