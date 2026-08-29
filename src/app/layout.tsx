import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Black_Han_Sans } from "next/font/google";
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

// Oversized display headings (page titles, the login wordmark) borrow this
// heavy poster-style face instead of just scaling up Freesentation — it's
// what actually reads as "designed" rather than "default UI font, but big".
const blackHanSans = Black_Han_Sans({
  subsets: ["korean", "latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DAILY SENTENCES",
  description: "날짜별로 메모와 할 일을 남기는 캘린더 웹앱. Google 계정으로 로그인하세요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#faf8f5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${freesentation.variable} ${blackHanSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-(--color-ink)">
        {children}
      </body>
    </html>
  );
}
