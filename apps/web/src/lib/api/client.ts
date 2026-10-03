const getApiUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url.replace(/\/+$/, '');
  return 'http://localhost:3000';
};

export async function fetchWithAuth(url: string, initData: string, options: RequestInit = {}) {
  const apiUrl = getApiUrl();
  const headers = {
    ...options.headers,
    'Authorization': `tma ${initData}`,
    'Content-Type': 'application/json',
  };

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${url}`, {
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
