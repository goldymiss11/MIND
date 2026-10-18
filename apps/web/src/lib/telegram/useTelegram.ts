import { useEffect, useState } from 'react';
import { getTelegramInitData } from '../api/client';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [initData, setInitData] = useState<string>('');

  useEffect(() => {
    const rawInit = getTelegramInitData();
    if (rawInit) {
      setInitData(rawInit);
    }

    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setIsReady(true);
      if (tg.initDataUnsafe?.user) {
        setUser(tg.initDataUnsafe.user as TelegramUser);
      } else {
        setUser({
          id: 100000001,
          first_name: "Александр",
          last_name: "MIND",
          username: "alexandr_mind",
          is_premium: true,
        });
      }
      if (tg.initData) {
        setInitData(tg.initData);
      }
    } else if (rawInit) {
      setIsReady(true);
    } else {
      // Development or headless preview fallback
      setIsReady(true);
      setUser({
        id: 100000001,
        first_name: "Александр",
        last_name: "MIND",
        username: "alexandr_mind",
        is_premium: true,
      });
    }
  }, []);

  const close = () => {
    try {
      window.Telegram?.WebApp?.close?.();
    } catch {
      // Safe ignore
    }
  };

  return {
    isReady,
    user,
    initData,
    close,
    webApp: typeof window !== 'undefined' ? window.Telegram?.WebApp : null,
  };
}
