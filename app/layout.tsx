import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import { ContextMenuBlocker } from "@/components/context-menu-blocker";
import "./globals.css";

const pretendard = localFont({
  src: [
    { path: "../public/font/Pretendard-Thin.ttf", weight: "100", style: "normal" },
    {
      path: "../public/font/Pretendard-ExtraLight.ttf",
      weight: "200",
      style: "normal",
    },
    { path: "../public/font/Pretendard-Light.ttf", weight: "300", style: "normal" },
    {
      path: "../public/font/Pretendard-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/font/Pretendard-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/font/Pretendard-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    { path: "../public/font/Pretendard-Bold.ttf", weight: "700", style: "normal" },
    {
      path: "../public/font/Pretendard-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
    { path: "../public/font/Pretendard-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-pretendard",
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
  display: "swap",
});

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "UX Archive",
  url: "https://www.uxarchive.app",
  logo: "https://www.uxarchive.app/logo.png",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "UX Archive",
  url: "https://www.uxarchive.app/",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.uxarchive.app"),
  applicationName: "UX Archive",
  title: {
    default: "UX Archive",
    template: "%s | UX Archive",
  },
  description:
    "From screenshots to structured insights — all in one clean workspace.",
  keywords: [
    "UX Archive",
    "UX pattern archive",
    "UI Archive",
    "UX patterns",
    "UI patterns",
    "Product design",
    "User experience",
    "Insights",
    "Design reference",
  ],
  alternates: {
    canonical: "https://www.uxarchive.app/",
  },
  openGraph: {
    title: "UX Archive",
    description:
      "From screenshots to structured insights — all in one clean workspace.",
    url: "https://www.uxarchive.app",
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
      "From screenshots to structured insights — all in one clean workspace.",
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
        className={`${pretendard.variable} antialiased`}
      >
        <Script
          id="org-ld"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <Script
          id="website-ld"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd),
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
