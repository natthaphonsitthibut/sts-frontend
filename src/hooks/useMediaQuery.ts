import { useCallback, useSyncExternalStore } from "react";

/**
 * Tracks a CSS media query for the cases Tailwind's responsive prefixes cannot
 * cover — a component that renders a different surface, not just different
 * classes, on a narrow screen.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
