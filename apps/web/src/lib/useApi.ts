"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "./api/client";
import { IS_DEV, useTelegram } from "./telegram/useTelegram";

export function useApi() {
  const telegram = useTelegram();
  const { initData, isReady } = telegram;
  const isPreview = isReady && !initData && IS_DEV;
  const isOutsideTelegram = isReady && !initData && !IS_DEV;

  /** Sends a request. In a development preview nothing is sent and `previewResult` comes back. */
  const request = useCallback(
    async <T = any>(path: string, method: string, body?: unknown, previewResult?: T): Promise<T> => {
      if (!initData && IS_DEV) return previewResult as T;
      return fetchWithAuth<T>(`/api/miniapp${path}`, initData, {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    },
    [initData]
  );

  return { ...telegram, isPreview, isOutsideTelegram, request };
}

/** Loads a Mini App resource, with sample data in a development preview. */
export function useResource<T>(path: string, previewData: T) {
  const { isReady, request, isOutsideTelegram } = useApi();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await request<T>(path, "GET", undefined, previewData));
    } catch (err: any) {
      setError(err.message || "Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
    // previewData is a constant for each call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, request]);

  useEffect(() => {
    if (!isReady) return;
    if (isOutsideTelegram) {
      setLoading(false);
      return;
    }
    void reload();
  }, [isReady, isOutsideTelegram, reload]);

  return { data, setData, error, loading: loading || !isReady, reload, isOutsideTelegram };
}
