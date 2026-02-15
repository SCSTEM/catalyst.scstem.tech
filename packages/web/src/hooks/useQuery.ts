import { useEffect, useState } from "react";

const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

function dedupedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }
  const promise = fetcher().finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

interface UseQueryOptions {
  key?: string;
  pollingInterval?: number;
}

export function useQuery<T>(
  fetcher: () => Promise<T>,
  options?: UseQueryOptions,
) {
  const cached = options?.key
    ? (cache.get(options.key) as T | undefined)
    : undefined;
  const [data, setData] = useState<T | null>(cached ?? null);
  const [loading, setLoading] = useState(cached == null);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch (stale-while-revalidate when cached)
  useEffect(() => {
    let cancelled = false;
    if (!cached) {
      setLoading(true);
    }
    setError(null);
    const request = options?.key
      ? dedupedFetch(options.key, fetcher)
      : fetcher();
    request
      .then((result) => {
        if (!cancelled) {
          setData(result);
          if (options?.key) {
            cache.set(options.key, result);
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unknown error");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  // Polling (pauses when tab is hidden)
  useEffect(() => {
    const interval = options?.pollingInterval;
    if (!interval) {
      return;
    }

    let timer: ReturnType<typeof setInterval> | null = null;

    function poll() {
      fetcher()
        .then((result) => {
          setData(result);
          if (options?.key) {
            cache.set(options.key, result);
          }
        })
        .catch(() => {});
    }

    function start() {
      if (timer) {
        return;
      }
      timer = setInterval(poll, interval);
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function onVisibilityChange() {
      if (document.hidden) {
        stop();
      } else {
        poll();
        start();
      }
    }

    if (!document.hidden) {
      start();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetcher, options?.pollingInterval]);

  return { data, loading, error };
}
