import type { Metadata, Viewport } from "next";
import "./globals.css";
import Script from "next/script";
import { Navigation } from "../components/Navigation";

export const metadata: Metadata = {
  title: "MIND",
  description: "Personal AI Operating System",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className="min-h-screen pb-28 sm:pb-32 font-sans bg-[#000000] text-white selection:bg-[#007aff]/30 antialiased">
        {children}
        <Navigation />
      </body>
    </html>
  );
}
