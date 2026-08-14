import { useState, type ReactNode } from "react";
import { SidebarContainer } from "../base";
import { cn } from "../../lib/utils";
import { useSidebarUiStore } from "./sidebar-ui.store";

interface CollapsibleDesktopSidebarProps {
  children: (collapsed: boolean) => ReactNode;
}

/**
 * The desktop navigation rail shared by authenticated and teacher-link
 * layouts. A pinned collapsed rail expands temporarily on hover, while the
 * header control keeps its persisted collapsed preference unchanged.
 */
export function CollapsibleDesktopSidebar({
  children,
}: CollapsibleDesktopSidebarProps) {
  const collapsed = useSidebarUiStore((state) => state.collapsed);
  const [hovered, setHovered] = useState(false);
  const [focusedWithin, setFocusedWithin] = useState(false);
  const visuallyCollapsed = collapsed && !hovered && !focusedWithin;

  return (
    <div
      className={cn(
        "hidden h-full shrink-0 transition-[width] duration-300 ease-out motion-reduce:transition-none lg:block",
        visuallyCollapsed ? "w-20" : "w-[260px]",
      )}
    >
      <SidebarContainer
        className={cn(
          "h-full overflow-x-hidden transition-[width] duration-300 ease-out motion-reduce:transition-none",
          visuallyCollapsed ? "w-20" : "w-[260px]",
        )}
        onBlurCapture={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            setFocusedWithin(false);
          }
        }}
        onFocusCapture={() => setFocusedWithin(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {children(visuallyCollapsed)}
      </SidebarContainer>
    </div>
  );
}
