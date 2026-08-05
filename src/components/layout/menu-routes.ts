import type { MenuItem } from "../../features/auth/lib/permissions";

/** Every route a rail can own, including sub-routes registered as `activeRoutes`. */
export function collectMenuRoutes(items: MenuItem[]): string[] {
  const routes: string[] = [];
  for (const entry of items) {
    if (entry.route) routes.push(entry.route);
    if (entry.activeRoutes) routes.push(...entry.activeRoutes);
    if (entry.children) routes.push(...collectMenuRoutes(entry.children));
  }
  return routes;
}
