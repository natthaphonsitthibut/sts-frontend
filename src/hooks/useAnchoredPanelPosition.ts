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
 * Render the panel in a portal with `fixed` and the returned style. Pass both
 * trigger and panel refs to useDismissable so panel interactions stay inside.
 * It flips above the anchor when there is more room there, and follows it on scroll,
 * resize and any change listed in `deps` (e.g. a chip field growing a row).
 */
export function useAnchoredPanelPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  panelMaxHeight: number,
  deps: DependencyList = [],
  panelMinWidth = 0,
  placement: "auto" | "top" = "auto",
): CSSProperties | null {
  const [style, setStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    function updatePosition(): void {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gutter = 8;
      const roomBelow = Math.max(
        0,
        window.innerHeight - rect.bottom - gutter - PANEL_GAP,
      );
      const roomAbove = Math.max(0, rect.top - gutter - PANEL_GAP);
      const openUp =
        placement === "top" ||
        (roomBelow < panelMaxHeight && roomAbove > roomBelow);
      const width = Math.min(
        Math.max(0, window.innerWidth - gutter * 2),
        Math.max(rect.width, panelMinWidth),
      );
      const left = Math.max(
        gutter,
        Math.min(rect.left, window.innerWidth - gutter - width),
      );
      const maxHeight = Math.min(
        panelMaxHeight,
        openUp ? roomAbove : roomBelow,
      );
      setStyle(
        openUp
          ? {
              left,
              width,
              maxHeight,
              bottom: window.innerHeight - rect.top + PANEL_GAP,
            }
          : {
              left,
              width,
              maxHeight,
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
  }, [open, anchorRef, panelMaxHeight, panelMinWidth, placement, ...deps]);

  return open ? style : null;
}
