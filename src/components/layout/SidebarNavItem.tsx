import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import type { MenuItem } from "../../features/auth/lib/permissions";
import { LayoutIcon } from "./LayoutIcon";

interface SidebarNavItemProps {
  collapsed?: boolean;
  item: MenuItem;
  onExpandSidebar?: () => void;
  onNavigate?: () => void;
}

function navLinkClassName(
  { isActive }: { isActive: boolean },
  collapsed = false,
): string {
  return cn(
    "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900",
    collapsed && "justify-center px-0",
    isActive && "bg-primary-soft font-semibold text-primary",
  );
}

export function SidebarNavItem({
  collapsed = false,
  item,
  onExpandSidebar,
  onNavigate,
}: SidebarNavItemProps) {
  const location = useLocation();
  const hasActiveChild = Boolean(
    item.children?.some((child) => child.route === location.pathname),
  );
  // Start expanded when the current route lives inside this group; the user can
  // then toggle it freely.
  const [open, setOpen] = useState(hasActiveChild);

  function handleGroupToggle(): void {
    if (collapsed) {
      onExpandSidebar?.();
      setOpen(true);
      return;
    }

    setOpen((value) => !value);
  }

  if (item.children) {
    return (
      <div>
        <button
          type="button"
          aria-expanded={collapsed ? undefined : open}
          aria-label={collapsed ? item.label : undefined}
          onClick={handleGroupToggle}
          title={collapsed ? item.label : undefined}
          className={cn(
            "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors hover:bg-slate-100",
            collapsed && "justify-center px-0",
            open || hasActiveChild
              ? "bg-primary-soft font-semibold text-primary"
              : "text-slate-600 hover:text-slate-900",
          )}
        >
          <LayoutIcon className="size-5 shrink-0" iconName={item.iconName} />
          <span className={cn("min-w-0 flex-1 truncate", collapsed && "sr-only")}>
            {item.label}
          </span>
          {!collapsed ? (
            <ChevronDown
              className={cn("size-4 text-slate-400 transition-transform", open && "rotate-180")}
              aria-hidden="true"
            />
          ) : null}
        </button>
        {!collapsed ? (
          <div
            aria-hidden={!open}
            className={cn(
              "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
              open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="overflow-hidden">
              <div className={cn("space-y-0.5 py-1 pl-4", !open && "invisible")}>
                {item.children.map((child) => (
                  <NavLink
                    className={(state) => navLinkClassName(state)}
                    key={child.id}
                    onClick={onNavigate}
                    to={child.route || "#"}
                    tabIndex={open ? undefined : -1}
                  >
                    <LayoutIcon className="size-4 shrink-0" iconName={child.iconName} />
                    <span className="truncate">{child.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <NavLink
      aria-label={collapsed ? item.label : undefined}
      className={(state) => navLinkClassName(state, collapsed)}
      end={item.route === "/"}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      to={item.route || "#"}
    >
      <LayoutIcon className="size-5 shrink-0" iconName={item.iconName} />
      <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
    </NavLink>
  );
}
