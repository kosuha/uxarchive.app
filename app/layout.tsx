import type { Metadata } from "next";
import Script from "next/script";
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

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "UX Archive",
  url: "https://uxarchive.app",
  logo: "https://uxarchive.app/logo.png",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://uxarchive.app"),
  applicationName: "UX Archive",
  title: {
    default: "UX Archive",
    template: "%s | UX Archive",
  },
  description:
    "A pattern collection and insight archive tool for designers and product managers.",
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
      "A pattern collection and insight archive tool for designers and product managers.",
    url: "https://uxarchive.app",
    siteName: "UX Archive",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 300,
        height: 300,
        alt: "UX Archive logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "UX Archive",
    description:
      "A pattern collection and insight archive tool for designers and product managers.",
    images: ["/logo.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: ["/favicon.svg", "/logo.png"],
    apple: [
      { url: "/favicon.svg" },
      { url: "/logo.png", type: "image/png" },
    ],
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
        <Script
          id="org-ld"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
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
