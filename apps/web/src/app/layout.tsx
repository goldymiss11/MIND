import type { Metadata, Viewport } from "next";
import "./globals.css";
import Script from "next/script";
import { Navigation } from "../components/Navigation";
import { TelegramShell } from "../components/TelegramShell";

export const metadata: Metadata = {
  title: "MIND",
  description: "Персональный AI-ассистент в Telegram",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// Runs before first paint so light-theme users never see a dark flash.
const applyThemeScript = `try{var s=window.Telegram&&Telegram.WebApp&&Telegram.WebApp.colorScheme;if(s)document.documentElement.dataset.theme=s}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <Script id="apply-theme" strategy="beforeInteractive">
          {applyThemeScript}
        </Script>
      </head>
      <body className="bg-page font-sans text-ink antialiased selection:bg-accent/30">
        <TelegramShell />
        {children}
        <Navigation />
      </body>
    </html>
  );
}
