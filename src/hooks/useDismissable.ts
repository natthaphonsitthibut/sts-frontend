import { useEffect, useRef, type RefObject } from "react";

export type DismissReason = "outside-press" | "escape";

/**
 * Shared dismissal behavior for every popover-style surface (pickers,
 * dropdown menus, tooltips, notification tray): while `open`, a pointer
 * press outside `containerRef` or the Escape key calls `onDismiss`.
 * The reason lets callers add reason-specific behavior, e.g. returning
 * focus to the trigger only on Escape.
 */
export function useDismissable(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onDismiss: (reason: DismissReason) => void,
): void {
  // Same pattern as Dialog's onOpenChangeRef: keep the latest closure in a
  // ref so an unmemoized callback doesn't re-bind the listeners every render.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onDismissRef.current("outside-press");
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") onDismissRef.current("escape");
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, containerRef]);
}
