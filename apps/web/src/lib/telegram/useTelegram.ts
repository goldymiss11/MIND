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

  const haptic = {
    impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') => {
      try {
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
      } catch {
        // Safe ignore
      }
    },
    notification: (type: 'error' | 'success' | 'warning') => {
      try {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
      } catch {
        // Safe ignore
      }
    },
    selection: () => {
      try {
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      } catch {
        // Safe ignore
      }
    },
  };

  const confirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.showConfirm) {
          window.Telegram.WebApp.showConfirm(message, (confirmed: boolean) => {
            resolve(confirmed);
          });
          return;
        }
      } catch {
        // Safe fallback
      }
      resolve(typeof window !== 'undefined' ? window.confirm(message) : true);
    });
  };

  const showAlert = (message: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert(message, () => resolve());
          return;
        }
      } catch {
        // Safe fallback
      }
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
      resolve();
    });
  };

  return {
    isReady,
    user,
    initData,
    close,
    confirm,
    showAlert,
    haptic,
    webApp: typeof window !== 'undefined' ? window.Telegram?.WebApp : null,
  };
}

