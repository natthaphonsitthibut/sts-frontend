import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * jsdom's storage is not usable under the runner's Node flags, and the auth
 * store reads it at import time, so give both storages a plain in-memory stand-in.
 */
function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key: string) => entries.get(key) ?? null,
    key: (index: number) => [...entries.keys()][index] ?? null,
    removeItem: (key: string) => void entries.delete(key),
    setItem: (key: string, value: string) =>
      void entries.set(key, String(value)),
  } as Storage;
}

for (const name of ["localStorage", "sessionStorage"] as const) {
  Object.defineProperty(window, name, {
    configurable: true,
    value: createMemoryStorage(),
  });
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});
