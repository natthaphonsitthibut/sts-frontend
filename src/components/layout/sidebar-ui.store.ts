import { create } from "zustand";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "sts_sidebar_collapsed";

interface SidebarUiState {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readStoredCollapsed(): boolean {
  if (!isBrowser()) {
    return true;
  }

  const storedValue = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
  return storedValue === null ? true : storedValue === "true";
}

function writeStoredCollapsed(collapsed: boolean): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(
    SIDEBAR_COLLAPSED_STORAGE_KEY,
    collapsed ? "true" : "false",
  );
}

export const useSidebarUiStore = create<SidebarUiState>((set, get) => ({
  collapsed: readStoredCollapsed(),
  setCollapsed: (collapsed) => {
    writeStoredCollapsed(collapsed);
    set({ collapsed });
  },
  toggleCollapsed: () => {
    const collapsed = !get().collapsed;
    writeStoredCollapsed(collapsed);
    set({ collapsed });
  },
}));
