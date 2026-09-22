import { useLayoutEffect, useRef, useState } from "react";

interface SlideIndicatorRect {
  left: number;
  width: number;
}

/**
 * Measures the active tab/segment button's box (relative to its scrollable
 * container) so a sliding indicator can transform to it instead of jumping —
 * shared by the underline Tabs and pill-style filters.
 */
export function useSlideIndicator(activeKey: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef(new Map<string, HTMLButtonElement>());
  const [rect, setRect] = useState<SlideIndicatorRect | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const button = buttonsRef.current.get(activeKey);
    if (!container || !button) {
      setRect(null);
      return;
    }
    const measure = () => {
      setRect({
        left: button.offsetLeft,
        width: button.offsetWidth,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(button);
    return () => observer.disconnect();
  }, [activeKey]);

  function setButtonRef(key: string, node: HTMLButtonElement | null) {
    if (node) buttonsRef.current.set(key, node);
    else buttonsRef.current.delete(key);
  }

  return { containerRef, rect, setButtonRef };
}
