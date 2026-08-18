import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function normalizePath(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

export function useRouteTab<const R extends Readonly<Record<string, string>>>(
  routes: R,
  defaultTab: keyof R & string,
): readonly [keyof R & string, (value: string) => void] {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = normalizePath(location.pathname);
  const activeTab =
    (Object.entries(routes).find(
      ([, path]) => normalizePath(String(path)) === currentPath,
    )?.[0] as (keyof R & string) | undefined) ?? defaultTab;

  const setActiveTab = useCallback(
    (value: string): void => {
      if (!(value in routes)) return;
      const nextPath = routes[value as keyof R];
      if (normalizePath(nextPath) !== currentPath) {
        // A tab switch stays on the same page, so it must carry the navigation
        // context forward; dropping it collapses the breadcrumb of every page
        // opened from the new tab down to its default parent.
        void navigate(
          { pathname: nextPath, search: location.search },
          { state: location.state },
        );
      }
    },
    [currentPath, location.search, location.state, navigate, routes],
  );

  return [activeTab, setActiveTab] as const;
}
