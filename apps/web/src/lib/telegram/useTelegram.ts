import { useEffect, useState } from 'react';

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
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setIsReady(true);
      if (tg.initDataUnsafe?.user) {
        setUser(tg.initDataUnsafe.user as TelegramUser);
      }
      if (tg.initData) {
        setInitData(tg.initData);
      }
    }
  }, []);

  const close = () => {
    window.Telegram?.WebApp.close();
  };

  return {
    isReady,
    user,
    initData,
    close,
    webApp: typeof window !== 'undefined' ? window.Telegram?.WebApp : null,
  };
}
