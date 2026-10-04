import { retrieveRawInitData, retrieveLaunchParams } from '@telegram-apps/sdk-react';

/**
 * Retrieves the raw Telegram Web App initData string.
 * Uses @telegram-apps/sdk-react with fallback to window.Telegram.WebApp.initData.
 */
export function getTelegramInitData(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  // 1. Try from @telegram-apps/sdk-react retrieveRawInitData
  try {
    const raw = retrieveRawInitData();
    if (raw && typeof raw === 'string') {
      return raw;
    }
  } catch {
    // Ignore error if not initialized via launch params
  }

  // 2. Try from @telegram-apps/sdk-react retrieveLaunchParams
  try {
    const lp = retrieveLaunchParams();
    if (lp && typeof lp.initDataRaw === 'string') {
      return lp.initDataRaw;
    }
  } catch {
    // Ignore error
  }

  // 3. Fallback to Telegram WebApp object
  try {
    if (window.Telegram?.WebApp?.initData) {
      return window.Telegram.WebApp.initData;
    }
  } catch {
    // Ignore error
  }

  return '';
}

export const getApiUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url.replace(/\/+$/, '');
  return 'http://localhost:3000';
};

export interface FetchOptions extends RequestInit {
  initData?: string;
}

/**
 * HTTP client / fetch wrapper that automatically attaches the
 * Authorization: tma ${initData} header to every request.
 */
export async function fetchWithAuth<T = any>(
  url: string,
  arg2?: string | FetchOptions,
  arg3?: FetchOptions
): Promise<T> {
  let explicitInitData: string | undefined;
  let options: FetchOptions = {};

  if (typeof arg2 === 'string') {
    explicitInitData = arg2;
    options = arg3 || {};
  } else if (arg2 && typeof arg2 === 'object') {
    options = arg2;
    explicitInitData = options.initData;
  }

  const initData = explicitInitData || getTelegramInitData();
  const apiUrl = getApiUrl();
  const requestUrl = url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `${apiUrl}${url.startsWith('/') ? url : `/${url}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (initData) {
    headers['Authorization'] = `tma ${initData}`;
  }

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    if (apiUrl.includes('localhost') && typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
      throw new Error(`Не настроена переменная NEXT_PUBLIC_API_URL в сборке (обращение к ${apiUrl}).`);
    }
    throw new Error(`Ошибка сети при обращении к API: ${netErr?.message || 'Failed to fetch'}`);
  }

  if (!response.ok) {
    let errorMsg = `Ошибка сервера (${response.status})`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorData.message || errorMsg;
    } catch {
      errorMsg = response.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * Convenient API Client with typed HTTP methods
 */
export const apiClient = {
  get: <T = any>(url: string, options?: FetchOptions) =>
    fetchWithAuth<T>(url, { ...options, method: 'GET' }),

  post: <T = any>(url: string, body?: any, options?: FetchOptions) =>
    fetchWithAuth<T>(url, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(url: string, body?: any, options?: FetchOptions) =>
    fetchWithAuth<T>(url, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(url: string, options?: FetchOptions) =>
    fetchWithAuth<T>(url, { ...options, method: 'DELETE' }),
};
