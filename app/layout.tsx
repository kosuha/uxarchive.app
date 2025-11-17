import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import { ContextMenuBlocker } from "@/components/context-menu-blocker";
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
  metadataBase: new URL("https://uxarchive.app"),
  applicationName: "UX Archive",
  title: {
    default: "UX Archive",
    template: "%s | UX Archive",
  },
  description:
    "A pattern collection and insight archive tool for UX teams and product designers.",
  keywords: [
    "UX Archive",
    "UX patterns",
    "Product design",
    "Insights",
    "Design reference",
  ],
  openGraph: {
    title: "UX Archive",
    description:
      "Workspace for organizing service-specific UX patterns and captures and leaving insights with pins.",
    url: "https://uxarchive.app",
    siteName: "UX Archive",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UX Archive",
    description:
      "Designer-first workflow for managing pattern captures and insight notes in one place.",
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProviders>
          <ContextMenuBlocker />
          <div className="app-shell" data-app-shell>
            {children}
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
