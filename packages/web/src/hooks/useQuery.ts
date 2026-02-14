import { useEffect, useState } from "react";

interface UseQueryOptions {
  pollingInterval?: number;
}

export function useQuery<T>(
  fetcher: () => Promise<T>,
  options?: UseQueryOptions,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (!cancelled) {
          setData(result);
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
        .then((result) => setData(result))
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
