import { createContext, useContext } from "react";

interface OverlayScope {
  container: HTMLElement | null;
  ids: string[];
  register: (id: string) => () => void;
}
export const OverlayScopeContext = createContext<OverlayScope | null>(null);

export function useOwnedOverlayIds(): string[] {
  return useContext(OverlayScopeContext)?.ids ?? [];
}
