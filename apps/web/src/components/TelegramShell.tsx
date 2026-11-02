"use client";

import { useEffect } from "react";
import { fetchWithAuth, getTelegramInitData } from "../lib/api/client";
import { readStored, writeStored } from "../lib/storage";

const CHROME_COLORS = {
  dark: "#1c1c1e",
  light: "#f2f2f7",
};

/** Connects the page to the Telegram client: theme, window chrome and the device timezone. */
export function TelegramShell() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const applyTheme = () => {
      const scheme = tg.colorScheme === "light" ? "light" : "dark";
      document.documentElement.dataset.theme = scheme;
      tg.setHeaderColor?.(CHROME_COLORS[scheme]);
      tg.setBackgroundColor?.(CHROME_COLORS[scheme]);
      tg.setBottomBarColor?.(CHROME_COLORS[scheme]);
    };

    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes?.();
    applyTheme();
    tg.onEvent?.("themeChanged", applyTheme);

    // Only on a change, so a zone set by hand in the bot survives later visits.
    const initData = getTelegramInitData();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (initData && timezone && readStored("reportedTimezone") !== timezone) {
      fetchWithAuth("/api/miniapp/me", initData, {
        method: "PATCH",
        body: JSON.stringify({ timezone }),
      })
        .then(() => writeStored("reportedTimezone", timezone))
        .catch(() => {});
    }

    return () => tg.offEvent?.("themeChanged", applyTheme);
  }, []);

  return null;
}
