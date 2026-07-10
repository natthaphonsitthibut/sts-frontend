import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import type { MenuItem } from "../../features/auth/lib/permissions";
import { LayoutIcon } from "./LayoutIcon";

interface SidebarNavItemProps {
  collapsed?: boolean;
  item: MenuItem;
  onNavigate?: () => void;
}

function navLinkClassName(
  { isActive }: { isActive: boolean },
  collapsed = false,
  nested = false,
): string {
  return cn(
    "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900",
    collapsed && "justify-center px-0",
    collapsed && nested && "mx-auto min-h-10 w-10",
    isActive && "bg-primary-soft font-semibold text-primary",
  );
}

function isRouteActive(item: MenuItem, pathname: string): boolean {
  const routes = [item.route, ...(item.activeRoutes ?? [])].filter(Boolean);
  return routes.some((route) => route === pathname);
}

export function SidebarNavItem({
  collapsed = false,
  item,
  onNavigate,
}: SidebarNavItemProps) {
  const location = useLocation();
  const hasActiveChild = Boolean(
    item.children?.some((child) => isRouteActive(child, location.pathname)),
  );
  const [open, setOpen] = useState(hasActiveChild);
  const expanded = open;

  function handleGroupToggle(): void {
    setOpen((value) => !value);
  }

  if (item.children) {
    return (
      <div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={collapsed ? item.label : undefined}
          onClick={handleGroupToggle}
          title={collapsed ? item.label : undefined}
          className={cn(
            "relative flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors hover:bg-slate-100",
            collapsed && "justify-center px-0",
            hasActiveChild
              ? "bg-slate-50 font-semibold text-slate-700"
              : open
                ? "bg-slate-50 text-slate-700"
              : "text-slate-600 hover:text-slate-900",
          )}
        >
          <LayoutIcon className="size-5 shrink-0" iconName={item.iconName} />
          <span className={cn("min-w-0 flex-1 truncate", collapsed && "sr-only")}>
            {item.label}
          </span>
          {!collapsed ? (
            <ChevronDown
              className={cn("size-4 text-slate-400 transition-transform", expanded && "rotate-180")}
              aria-hidden="true"
            />
          ) : (
            <ChevronDown
              className={cn(
                "absolute bottom-1 right-1 size-3 text-slate-400 transition-transform",
                expanded && "rotate-180 text-primary",
              )}
              aria-hidden="true"
            />
          )}
        </button>
        <div
          aria-hidden={!expanded}
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div
              className={cn(
                "space-y-0.5 py-1",
                collapsed ? "border-l border-slate-200/80 pl-2" : "border-l border-slate-200 pl-4",
                !expanded && "invisible",
              )}
            >
              {item.children.map((child) => (
                <NavLink
                  aria-label={collapsed ? child.label : undefined}
                  className={() =>
                    navLinkClassName(
                      { isActive: isRouteActive(child, location.pathname) },
                      collapsed,
                      true,
                    )
                  }
                  key={child.id}
                  onClick={onNavigate}
                  title={collapsed ? child.label : undefined}
                  to={child.route || "#"}
                  tabIndex={expanded ? undefined : -1}
                >
                  <LayoutIcon className="size-4 shrink-0" iconName={child.iconName} />
                  <span className={cn("truncate", collapsed && "sr-only")}>
                    {child.label}
                  </span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
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
