import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ux-archive.app"),
  applicationName: "UX Archive",
  title: {
    default: "UX Archive",
    template: "%s | UX Archive",
  },
  description:
    "UX 팀과 프로덕트 디자이너를 위한 패턴 수집·인사이트 아카이브 도구",
  keywords: [
    "UX Archive",
    "UX 패턴",
    "프로덕트 디자인",
    "인사이트",
    "디자인 레퍼런스",
  ],
  openGraph: {
    title: "UX Archive",
    description:
      "서비스별 UX 패턴과 캡쳐를 정리하고 핀으로 인사이트를 남기는 워크스페이스",
    url: "https://ux-archive.app",
    siteName: "UX Archive",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UX Archive",
    description:
      "패턴 수집과 인사이트 메모를 한 번에 관리하는 디자이너용 워크플로우",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: ["/favicon.svg"],
    apple: [{ url: "/favicon.svg" }],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="app-shell" data-app-shell>
          {children}
        </div>
      </body>
    </html>
  );
}
