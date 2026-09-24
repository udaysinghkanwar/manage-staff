import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { validateEnv } from "@/lib/env";

validateEnv();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Staff Manager",
  description: "Staffing agency management dashboard",
  applicationName: "Staff Manager",
  other: {
    // Next emits the standardized `mobile-web-app-capable` for appleWebApp
    // .capable. iOS 16.4+ honours that and the manifest's display:standalone,
    // but older iOS only reads this legacy Apple-prefixed tag.
    "apple-mobile-web-app-capable": "yes",
  },
  appleWebApp: {
    capable: true,
    title: "Staff Manager",
    // "default" keeps iOS reserving the status bar area. "black-translucent"
    // would paint the page under it, which needs env(safe-area-inset-top)
    // padding on every screen -- the pages here only carry p-4 (16px) against
    // a ~59px inset, so it would clip headings instead of freeing space.
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Required for env(safe-area-inset-*) to resolve to anything but 0. The
  // dashboard layout already pads the bottom tab bar with those values, so
  // without this the bar sits under the home indicator on notched iPhones.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f8f8" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
