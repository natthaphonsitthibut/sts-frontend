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

/**
 * Label treatment while the sidebar collapses/expands: fade + squeeze in step
 * with the container's 200ms width transition instead of vanishing on the
 * first frame (`sr-only` snaps). Uses a px `max-w` cap on both ends because
 * `max-w-full` (a percentage) can't interpolate to `0px`; the negative margin
 * cancels the row's `gap-3` so a zero-width label leaves the icon perfectly
 * centered. Text stays in the accessibility tree in both states.
 */
function navLabelClassName(collapsed: boolean): string {
  return cn(
    "truncate transition-[opacity,max-width,margin] duration-200 ease-out motion-reduce:transition-none",
    collapsed ? "-ml-3 max-w-0 opacity-0" : "max-w-48 opacity-100",
  );
}

/**
 * `justify-center` is unconditional, not collapsed-only: while expanded the
 * `flex-1` label absorbs all free space so centering is a no-op (rows stay
 * left-aligned), and while collapsed it centers the bare icon. Toggling it
 * (or padding) per state would snap the icon/button to its new position on
 * the first frame of the 200ms width transition — with the layout constant,
 * the only thing animating is the label's squeeze, so icons glide instead.
 */
function navLinkClassName(
  { isActive }: { isActive: boolean },
  collapsed = false,
  nested = false,
): string {
  return cn(
    "flex min-h-10 w-full items-center justify-center gap-3 rounded-lg border border-transparent px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900",
    collapsed && nested && "mx-auto min-h-10 w-10",
    isActive && "border-primary/30 bg-primary-soft font-semibold text-primary-dark",
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
          title={collapsed ? `${item.label} — กดเพื่อเปิดหรือปิดเมนูย่อย` : undefined}
          className={cn(
            // justify-center is unconditional for the same glide reason as
            // navLinkClassName — the flex-1 label makes it a no-op expanded.
            "relative flex min-h-10 w-full items-center justify-center gap-3 rounded-lg border border-transparent px-3 text-left text-sm font-medium transition-colors hover:bg-slate-100",
            hasActiveChild
              ? "border-primary/30 bg-primary-soft font-semibold text-primary-dark"
              : open
                ? "bg-slate-50 text-slate-700"
                : "text-slate-600 hover:text-slate-900",
          )}
        >
          <LayoutIcon className="size-5 shrink-0" iconName={item.iconName} />
          {/* `mr-7` reserves the width the absolute chevron overlays (16px
              icon + 12px gap) so truncated text never runs under it; it
              animates away via the label's existing margin transition. */}
          <span
            className={cn("min-w-0 flex-1", !collapsed && "mr-7", navLabelClassName(collapsed))}
          >
            {item.label}
          </span>
          {/* One chevron for both states — swapping an in-flow element for an
              absolute one snaps on the first frame, so it is always absolute
              and glides between "row end, size-4" and "corner badge, size-3". */}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "absolute transition-[top,right,width,height,color,transform] duration-200 ease-out motion-reduce:transition-none",
              collapsed ? "right-1 top-6 size-3" : "right-3 top-3 size-4",
              expanded && "rotate-180",
              collapsed && expanded ? "text-primary" : "text-slate-500",
            )}
          />
        </button>
        <div
          aria-hidden={!expanded}
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            {/* No `visibility` toggle here — it can't transition, so it would
                blank the labels on the first frame of the collapse while the
                rows are still animating shut. `overflow-hidden` on the parent
                plus `aria-hidden`/`tabIndex` already cover paint and a11y. */}
            <div
              className={cn(
                "space-y-0.5 py-1",
                collapsed ? "border-l border-slate-200/80 pl-2" : "border-l border-slate-200 pl-4",
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
                  <span className={cn("min-w-0 flex-1", navLabelClassName(collapsed))}>
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
      <span className={cn("min-w-0 flex-1", navLabelClassName(collapsed))}>{item.label}</span>
    </NavLink>
  );
}
