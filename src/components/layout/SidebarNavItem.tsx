import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { MENU_ITEMS, type MenuItem } from "../../features/auth/lib/permissions";
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

function collectRoutes(items: MenuItem[]): string[] {
  const routes: string[] = [];
  for (const entry of items) {
    if (entry.route) routes.push(entry.route);
    if (entry.activeRoutes) routes.push(...entry.activeRoutes);
    if (entry.children) routes.push(...collectRoutes(entry.children));
  }
  return routes;
}

// Computed once from the static menu — every registered route in the app,
// used to resolve which item "owns" a given URL if two sibling routes ever
// end up nesting (e.g. a future "/reports" and "/reports/summary" that are
// separate pages, not a parent/sub-tab pair) — the longer, more specific
// route wins instead of both lighting up at once. Prefer non-nested sibling
// paths when adding new routes so this never has to arbitrate in practice.
const ALL_MENU_ROUTES = collectRoutes(MENU_ITEMS);

function routeMatchesPathname(route: string, pathname: string): boolean {
  return route === pathname || (route !== "/" && pathname.startsWith(`${route}/`));
}

/**
 * The most specific (longest) registered route that matches this pathname —
 * either exactly or as a real sub-route. Sibling pages whose paths happen to
 * nest (like the `/field-followers` example above) only ever resolve to one
 * winner instead of both matching independently.
 */
function findBestMatchingRoute(pathname: string): string | null {
  let best: string | null = null;
  for (const route of ALL_MENU_ROUTES) {
    if (!routeMatchesPathname(route, pathname)) continue;
    if (best === null || route.length > best.length) {
      best = route;
    }
  }
  return best;
}

/**
 * A nested menu item stays active on its own sub-routes too (e.g. a page
 * with tabs like "/attendance-links/history"), not just its exact path.
 * Matching goes through `findBestMatchingRoute` so that when two menu
 * routes nest inside each other, only the most specific one is active.
 */
function isRouteActive(item: MenuItem, pathname: string): boolean {
  const routes = [item.route, ...(item.activeRoutes ?? [])].filter(Boolean) as string[];
  if (routes.length === 0) return false;
  const bestMatch = findBestMatchingRoute(pathname);
  return bestMatch !== null && routes.includes(bestMatch);
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
              ? "bg-primary-soft font-semibold text-primary"
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
