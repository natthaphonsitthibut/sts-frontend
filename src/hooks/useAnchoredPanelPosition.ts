import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type DependencyList,
  type RefObject,
} from "react";

const PANEL_GAP = 4;

/**
 * Viewport coordinates for a popover panel that must not be clipped by a
 * scrolling ancestor — a Dialog scrolls its own content, so an `absolute`
 * panel inside it was cut off at the dialog's edge.
 *
 * The panel stays in the trigger's DOM subtree (render it `fixed` with the
 * returned style) so the Dialog's focus trap and the picker's outside-press
 * dismissal keep treating it as part of the control. It flips above the
 * anchor when there is more room there, and follows the anchor on scroll,
 * resize and any change listed in `deps` (e.g. a chip field growing a row).
 */
export function useAnchoredPanelPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  panelMaxHeight: number,
  deps: DependencyList = [],
): CSSProperties | null {
  const [style, setStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    function updatePosition(): void {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const roomBelow = window.innerHeight - rect.bottom;
      const openUp =
        roomBelow < panelMaxHeight + PANEL_GAP * 2 && rect.top > roomBelow;
      setStyle(
        openUp
          ? {
              left: rect.left,
              width: rect.width,
              bottom: window.innerHeight - rect.top + PANEL_GAP,
            }
          : {
              left: rect.left,
              width: rect.width,
              top: rect.bottom + PANEL_GAP,
            },
      );
    }
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller-supplied deps
  }, [open, anchorRef, panelMaxHeight, ...deps]);

  return open ? style : null;
}
