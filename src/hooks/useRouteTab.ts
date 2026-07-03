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
    (Object.entries(routes).find(([, path]) => normalizePath(String(path)) === currentPath)?.[0] as
      | (keyof R & string)
      | undefined) ?? defaultTab;

  function setActiveTab(value: string): void {
    if (!(value in routes)) return;
    const nextPath = routes[value as keyof R];
    if (normalizePath(nextPath) !== currentPath) {
      void navigate(nextPath);
    }
  }

  return [activeTab, setActiveTab] as const;
}
