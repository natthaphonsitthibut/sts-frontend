import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimum visible spin duration. A refetch on a fast connection resolves almost
 * instantly, so the refresh icon would flash for a few ms and feel like nothing
 * happened. Holding the spinner for at least this long makes every refresh button
 * read as "it refreshed" — defined once here so the timing is identical system-wide.
 */
const MIN_SPIN_MS = 600;

/**
 * Drives a refresh button's spinner with a guaranteed minimum spin time.
 *
 * Usage:
 *   const { isRefreshing, refresh } = useRefreshSpin();
 *   <Button isLoading={isRefreshing} loadingIconMotion="refresh"
 *           onClick={() => void refresh(() => query.refetch())} />
 */
export function useRefreshSpin() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async (action: () => Promise<unknown> | unknown) => {
    setIsRefreshing(true);
    const start = Date.now();
    try {
      await action();
    } finally {
      const remaining = Math.max(0, MIN_SPIN_MS - (Date.now() - start));
      window.setTimeout(() => {
        if (mountedRef.current) {
          setIsRefreshing(false);
        }
      }, remaining);
    }
  }, []);

  return { isRefreshing, refresh };
}
