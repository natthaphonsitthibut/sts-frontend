import { useCallback, useLayoutEffect, useRef, useState } from "react";

interface SlideIndicatorRect {
  left: number;
  width: number;
}

/**
 * Measures the active tab/segment button's box (relative to its scrollable
 * container) so a sliding indicator can transform to it instead of jumping —
 * shared by the underline Tabs and pill-style filters.
 *
 * The container is tracked as state, not a plain ref: a surface that unmounts
 * its tab row while the hook's owner stays mounted (the notification tray
 * closes to `null`) must measure the new row when it comes back. With a plain
 * ref the effect never re-ran on reopen, and the observer — still watching the
 * detached buttons — had stored a zero-width box, so the active tab showed
 * white text on an indicator with no width: an invisible tab.
 */
export function useSlideIndicator(activeKey: string) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const buttonsRef = useRef(new Map<string, HTMLButtonElement>());
  const [rect, setRect] = useState<SlideIndicatorRect | null>(null);

  useLayoutEffect(() => {
    const button = buttonsRef.current.get(activeKey);
    if (!container || !button) {
      setRect(null);
      return;
    }
    const measure = () => {
      // A detached or not-yet-laid-out button measures 0; report "no box"
      // so callers fall back to painting the active tab themselves.
      setRect(
        button.isConnected && button.offsetWidth > 0
          ? { left: button.offsetLeft, width: button.offsetWidth }
          : null,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(button);
    return () => observer.disconnect();
  }, [activeKey, container]);

  const setButtonRef = useCallback(
    (key: string, node: HTMLButtonElement | null) => {
      if (node) buttonsRef.current.set(key, node);
      else buttonsRef.current.delete(key);
    },
    [],
  );

  return { containerRef: setContainer, rect, setButtonRef };
}
