import { useEffect, useState } from 'react';
import { getTelegramInitData } from '../api/client';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

// Outside Telegram there is no user. Development still gets one, to preview the screens in a browser.
export const IS_DEV = process.env.NODE_ENV === 'development';
const PREVIEW_USER: TelegramUser | null = IS_DEV ? { id: 1, first_name: 'Гость' } : null;

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
    if (tg?.initDataUnsafe?.user) {
      setUser(tg.initDataUnsafe.user as TelegramUser);
    } else {
      setUser(PREVIEW_USER);
    }
    if (tg?.initData) {
      setInitData(tg.initData);
    }
    setIsReady(true);
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

