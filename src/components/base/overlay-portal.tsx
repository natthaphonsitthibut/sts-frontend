import { useContext, useId, useLayoutEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { OverlayScopeContext } from "./overlay-scope";

/** Escape scrolling content while staying inside the owning dialog's focus region. */
export function OverlayPortal({ children }: { children: ReactNode }) {
  const scope = useContext(OverlayScopeContext);
  const id = useId();
  const register = scope?.register;
  useLayoutEffect(() => register?.(id), [id, register]);
  return createPortal(
    <div className="contents" id={id}>
      {children}
    </div>,
    scope?.container ?? document.body,
  );
}
