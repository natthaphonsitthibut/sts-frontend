import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { MENU_ITEMS, type MenuItem } from "../../features/auth/lib/permissions";
import { LayoutIcon } from "./LayoutIcon";
import { collectMenuRoutes } from "./menu-routes";
import { getNavigationContext } from "./navigation-context";

interface SidebarNavItemProps {
  collapsed?: boolean;
  item: MenuItem;
  /**
   * Routes of the rail this item is rendered in. Needed for menus outside the
   * permission-driven registry (the teacher link), whose routes are unknown to
   * `ALL_MENU_ROUTES` and would otherwise all prefix-match at once.
   */
  menuRoutes?: string[];
  onNavigate?: () => void;
}

/**
 * Label treatment while the sidebar collapses/expands: fade + squeeze in step
 * with the container's 200ms width transition instead of vanishing on the
 * first frame (`sr-only` snaps). Uses a px `max-w` cap on both ends because
 * `max-w-full` (a percentage) can't interpolate to `0px`; the negative margin
 * cancels the row's `gap-3` so a zero-width label leaves the icon perfectly
 * centered. Text stays in the accessibility tree in both states.
 *
 * The expanded cap must stay wider than the widest label slot any rail can
 * offer (mobile sheet `w-72` minus the nav/row padding ≈ 216px, desktop
 * `w-64` less than that). A tighter cap leaves free space inside the row,
 * which the row's `justify-center` then centers — and rows with a chevron
 * reserve an extra `mr-7`, so they would centre by a different amount and
 * their icons would sit left of every other row's.
 */
function navLabelClassName(collapsed: boolean): string {
  return cn(
    "truncate transition-[opacity,max-width,margin] duration-300 ease-out motion-reduce:transition-none",
    collapsed ? "-ml-3 max-w-0 opacity-0" : "max-w-64 opacity-100",
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
    "group flex min-h-10 w-full items-center justify-center gap-3 rounded-lg border border-transparent px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-brand-soft hover:text-primary-dark",
    // Nested rows glide between full width and the collapsed icon square via
    // px max-width caps (percent↔px can't interpolate; max-w-60 ≥ the real
    // expanded width so it only bites while collapsing). Color transitions
    // ride along because conflicting transition-property utilities merge.
    nested &&
      "mx-auto max-w-60 transition-[max-width,background-color,border-color,color] duration-300 ease-out motion-reduce:transition-none",
    collapsed && nested && "max-w-10",
    // ล็อก hover ของ item ที่ active ไว้ที่โทน active เอง
    isActive &&
      "bg-brand-active font-semibold text-primary hover:bg-brand-active hover:text-primary",
  );
}

// Computed once from the static menu — every registered route in the app,
// used to resolve which item "owns" a given URL if two sibling routes ever
// end up nesting (e.g. a future "/reports" and "/reports/summary" that are
// separate pages, not a parent/sub-tab pair) — the longer, more specific
// route wins instead of both lighting up at once. Prefer non-nested sibling
// paths when adding new routes so this never has to arbitrate in practice.
const ALL_MENU_ROUTES = collectMenuRoutes(MENU_ITEMS);

function routeMatchesPathname(route: string, pathname: string): boolean {
  return (
    route === pathname || (route !== "/" && pathname.startsWith(`${route}/`))
  );
}

/**
 * The most specific (longest) registered route that matches this pathname —
 * either exactly or as a real sub-route. Sibling pages whose paths happen to
 * nest only ever resolve to one winner instead of both matching
 * independently.
 */
function findBestMatchingRoute(
  pathname: string,
  extraRoutes: string[] = [],
): string | null {
  let best: string | null = null;
  for (const route of [...ALL_MENU_ROUTES, ...extraRoutes]) {
    if (!routeMatchesPathname(route, pathname)) continue;
    if (best === null || route.length > best.length) {
      best = route;
    }
  }
  return best;
}

/**
 * A nested menu item stays active on its own sub-routes too (e.g. a page
 * with tabs like "/login-links/history"), not just its exact path.
 * Matching goes through `findBestMatchingRoute` so that when two menu
 * routes nest inside each other, only the most specific one is active.
 */
function isRouteActive(
  item: MenuItem,
  pathname: string,
  menuRoutes: string[] = [],
): boolean {
  const routes = [item.route, ...(item.activeRoutes ?? [])].filter(
    Boolean,
  ) as string[];
  if (routes.length === 0) return false;
  // `menuRoutes` carries the rail's own routes so a menu outside the
  // permission-driven registry still gets most-specific-wins arbitration.
  const bestMatch = findBestMatchingRoute(pathname, menuRoutes);
  if (bestMatch !== null) return routes.includes(bestMatch);
  return routes.some((route) => routeMatchesPathname(route, pathname));
}

export function SidebarNavItem({
  collapsed = false,
  item,
  menuRoutes,
  onNavigate,
}: SidebarNavItemProps) {
  const location = useLocation();
  const navigationContext = getNavigationContext(location.state);
  const contextualMenuRoute = navigationContext?.menuRoute;
  const activePathname =
    navigationContext && contextualMenuRoute === null
      ? ""
      : contextualMenuRoute &&
          (menuRoutes ?? []).some((route) =>
            routeMatchesPathname(route, contextualMenuRoute),
          )
        ? contextualMenuRoute
        : location.pathname;
  const hasActiveChild = Boolean(
    item.children?.some((child) =>
      isRouteActive(child, activePathname, menuRoutes),
    ),
  );
  // `null` means follow the route-derived default. Once the user toggles the
  // group, their explicit choice wins — including collapsing an active group.
  // Route-derived expansion keeps the currently selected child visible, while
  // the child alone owns the active treatment.
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const expanded = manualExpanded ?? hasActiveChild;

  function handleGroupToggle(): void {
    setManualExpanded(!expanded);
  }

  function toggleAfterPaint(): void {
    // Two frames: the first is the one React renders the new route into, the
    // second is after the browser has painted it.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setManualExpanded(!expanded)),
    );
  }

  const childrenVisible = expanded && !collapsed;

  if (item.children) {
    // Captured so the narrowing survives into the closure below.
    const groupChildren = item.children;

    function renderChildren() {
      return (
        // The slide stays, by the owner's call (2026-09-01): it is how the rest
        // of the product's menu behaves and matching that matters more here than
        // the frames it costs. `grid-template-rows: 0fr → 1fr` interpolates a
        // layout property, so every row in the group is laid out again on every
        // frame — fine for a menu of four, heavy for a teacher's forty rooms.
        // A composited `opacity`/`transform` reveal was tried and rejected for
        // looking different from the app's own groups; do not swap it back
        // without asking.
        <div
          aria-hidden={!childrenVisible}
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
            childrenVisible ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            {/* No `visibility` toggle here — it can't transition, so it would
                  blank the labels on the first frame of the collapse while the
                  rows are still animating shut. `overflow-hidden` on the parent
                  plus `aria-hidden`/`tabIndex` already cover paint and a11y. */}
            <div
              className={cn(
                "space-y-0.5 border-l py-1 transition-[padding] duration-300 ease-out motion-reduce:transition-none",
                collapsed
                  ? "border-slate-200/80 pl-2"
                  : "border-slate-200 pl-4",
              )}
            >
              {groupChildren.map((child) => {
                const childIsActive = isRouteActive(
                  child,
                  activePathname,
                  menuRoutes,
                );
                return (
                  <Link
                    aria-current={childIsActive ? "page" : undefined}
                    aria-label={collapsed ? child.label : undefined}
                    className={navLinkClassName(
                      { isActive: childIsActive },
                      collapsed,
                      true,
                    )}
                    key={child.id}
                    onClick={onNavigate}
                    title={collapsed ? child.label : undefined}
                    to={child.route || "#"}
                    tabIndex={childrenVisible ? undefined : -1}
                  >
                    <LayoutIcon
                      className="size-4 shrink-0 transition-transform duration-150 ease-out group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      iconName={child.iconName}
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1",
                        navLabelClassName(collapsed),
                      )}
                    >
                      {child.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // A group that is also a page — the classroom link's ห้องเรียนของฉัน — opens
    // its page and folds its list from the same row. Reaching the rooms and
    // reaching the page they are listed on is one intent, so it is one control,
    // and the row keeps the shape the app's own groups have.
    const groupIsActive = Boolean(
      item.route && isRouteActive(item, activePathname, menuRoutes),
    );
    // The same builder every other row uses, so an active group wears the
    // product's active treatment rather than a second one invented here.
    // `relative` anchors the chevron; `text-left` is the button reset.
    const groupRowClassName = cn(
      navLinkClassName({ isActive: groupIsActive }, collapsed),
      "relative text-left",
    );
    const groupIcon = (
      <LayoutIcon
        className="size-5 shrink-0 transition-transform duration-150 ease-out group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        iconName={item.iconName}
      />
    );
    const groupLabel = (
      <span
        className={cn(
          "min-w-0 flex-1",
          !collapsed && "mr-7",
          navLabelClassName(collapsed),
        )}
      >
        {item.label}
      </span>
    );
    // Byte-for-byte the chevron every other group uses. It has to be the same
    // element with the same transition, not an equivalent one: two nested boxes
    // animating their own size during the rail's 300ms squeeze is what made
    // this row wobble while the app's own groups glided.
    const groupChevron = (
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "absolute transition-[top,right,width,height,color,transform] duration-300 ease-out motion-reduce:transition-none",
          collapsed ? "right-1 top-6 size-3" : "right-3 top-3 size-4",
          expanded && "rotate-180",
          collapsed && expanded ? "text-primary" : "text-slate-500",
        )}
      />
    );

    if (item.route) {
      return (
        <div>
          {/* One control, not two: the whole row opens the page and folds the
              list at the same time, so the markup stays the single row the
              app's own groups are — no wrapper for a second hit target to
              animate against. */}
          <div className="relative">
            <Link
              aria-current={groupIsActive ? "page" : undefined}
              aria-label={collapsed ? item.label : undefined}
              className={groupRowClassName}
              onClick={() => {
                onNavigate?.();
                // The whole row folds and unfolds, not just the chevron — but
                // not in the same frames as the page it opens. The destination's
                // first layout is the expensive part, so the fold starts once
                // that has painted.
                toggleAfterPaint();
              }}
              title={collapsed ? item.label : undefined}
              to={item.route}
            >
              {groupIcon}
              {groupLabel}
            </Link>
            {groupChevron}
            {/* An empty overlay over the chevron end of the row, not a box around
                the chevron: the glyph keeps the exact absolute coordinates and
                transition every other group uses, and nothing nested animates its
                own size beside it. Wide enough to hit without aiming, and it sits
                inside the space the label already reserves with `mr-7`.

                Separate from the row on purpose. Folding the list and loading a
                page are both cheap alone; together the page's first layout lands
                in the middle of the accordion's 300ms and drops its frames. */}
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={`${item.label} — เปิดหรือปิดเมนูย่อย`}
              className="absolute inset-y-0 right-0 w-9 rounded-lg"
              onClick={handleGroupToggle}
              title="เปิดหรือปิดเมนูย่อย"
            />
          </div>
          {renderChildren()}
        </div>
      );
    }

    return (
      <div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={collapsed ? item.label : undefined}
          onClick={handleGroupToggle}
          title={
            collapsed ? `${item.label} — กดเพื่อเปิดหรือปิดเมนูย่อย` : undefined
          }
          className={groupRowClassName}
        >
          {groupIcon}
          {/* `mr-7` on the label reserves the width the absolute chevron
              overlays (16px icon + 12px gap) so truncated text never runs
              under it; it animates away via the label's margin transition. */}
          {groupLabel}
          {/* One chevron for both states — swapping an in-flow element for an
              absolute one snaps on the first frame, so it is always absolute
              and glides between "row end, size-4" and "corner badge, size-3". */}
          {groupChevron}
        </button>
        {renderChildren()}
      </div>
    );
  }

  const itemIsActive = isRouteActive(item, activePathname, menuRoutes);
  return (
    <Link
      aria-current={itemIsActive ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      // Active state comes from `isRouteActive`, not router prefix matching,
      // so nested navigation items do not light up their parent too.
      className={navLinkClassName({ isActive: itemIsActive }, collapsed)}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      to={item.route || "#"}
    >
      <LayoutIcon
        className="size-5 shrink-0 transition-transform duration-150 ease-out group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        iconName={item.iconName}
      />
      <span className={cn("min-w-0 flex-1", navLabelClassName(collapsed))}>
        {item.label}
      </span>
    </Link>
  );
}
