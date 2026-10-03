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
      <body className="pb-20 font-sans">
        {children}
        <Navigation />
      </body>
    </html>
  );
}
