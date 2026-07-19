import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getEffectivePermissions,
  getFirstAccessibleRoute,
  isStudentOnlyRole,
} from "../lib/permissions";
import type { AuthUser } from "../types/auth.types";

export function usePostLoginRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  const nextRoute = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const next = params.get("next") || "";
    return next.startsWith("/") ? next : "";
  }, [location.search]);

  return (user: AuthUser): void => {
    if (user.must_change_password) {
      void navigate("/change-password");
      return;
    }

    const userPermissions = getEffectivePermissions(
      user.roles || [],
      user.permissions || [],
    );

    if (isStudentOnlyRole(user.roles || [])) {
      void navigate("/my-attendance");
      return;
    }

    const targetRoute =
      nextRoute ||
      getFirstAccessibleRoute(userPermissions);

    void navigate(targetRoute);
  };
}
