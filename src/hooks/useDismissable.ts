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
  // A portaled surface (e.g. a dropdown panel rendered into document.body to
  // escape a scroll-clipped table) lives outside the trigger's DOM subtree —
  // pass both refs so a press inside either counts as "inside".
  containerRef: RefObject<HTMLElement | null> | Array<RefObject<HTMLElement | null>>,
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
    const refs = Array.isArray(containerRef) ? containerRef : [containerRef];

    function handlePointerDown(event: MouseEvent | TouchEvent): void {
      const target = event.target as Node;
      const isInside = refs.some((ref) => ref.current?.contains(target));
      if (!isInside) onDismissRef.current("outside-press");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs are stable identities; array literals from callers are fine to re-diff by open only
  }, [open]);
}
