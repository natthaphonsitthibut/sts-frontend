import { PAGE_IDENTITIES } from "../../../components/layout/page-identity";

export interface DataScope {
  global?: boolean;
  provinces?: string[];
  districts?: string[];
  sub_districts?: string[];
  school_ids?: number[];
  grade_levels?: number[];
  room_ids?: Array<number | string>;
  own_only?: boolean;
}

interface DataScopeSchoolLabel {
  id: number | string;
  name?: string | null;
}

interface DataScopeGradeLevelLabel {
  id: number | string;
  label?: string | null;
}

export interface MenuItem {
  id: string;
  label: string;
  iconName?: string;
  permissionId?: string | string[];
  route?: string;
  activeRoutes?: string[];
  children?: MenuItem[];
}

export const GRANT_EXEMPT_PERMISSION_IDS = ["student-self"] as const;

const EXECUTIVE_ALLOWED_PERMISSIONS = ["home"] as const;

export const ROLE_RANKS: Record<string, number> = {
  STUDENT: 1,
  TEACHER: 2,
  EXECUTIVE: 3,
  DIRECTOR: 4,
  ADMIN: 5,
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  DIRECTOR: "ผู้อำนวยการ",
  EXECUTIVE: "ผู้บริหาร",
  TEACHER: "คุณครู",
  STUDENT: "นักเรียน",
};

export function describeDataScopeForDisplay(
  scope: DataScope | null | undefined,
  schoolLabels: DataScopeSchoolLabel[] = [],
  gradeLevelLabels: DataScopeGradeLevelLabel[] = [],
): string {
  if (!scope) return "-";
  if (scope.own_only) return "เฉพาะข้อมูลของตนเอง";

  const parts: string[] = [];
  if (scope.global) parts.push("ทั้งประเทศ");
  if (scope.provinces?.length) parts.push(`จังหวัด: ${scope.provinces.join(", ")}`);
  if (scope.districts?.length) parts.push(`อำเภอ/เขต: ${scope.districts.join(", ")}`);
  if (scope.sub_districts?.length) parts.push(`ตำบล/แขวง: ${scope.sub_districts.join(", ")}`);
  if (scope.school_ids?.length) {
    const schoolText =
      schoolLabels.length > 0
        ? schoolLabels.map((school) => school.name ?? school.id).join(", ")
        : scope.school_ids.join(", ");
    parts.push(`โรงเรียน: ${schoolText}`);
  }
  if (scope.grade_levels?.length) {
    const gradeText =
      gradeLevelLabels.length > 0
        ? gradeLevelLabels.map((grade) => grade.label ?? grade.id).join(", ")
        : scope.grade_levels.join(", ");
    parts.push(`ระดับชั้น: ${gradeText}`);
  }
  if (scope.room_ids?.length) parts.push(`ห้อง: ${scope.room_ids.join(", ")}`);

  return parts.length > 0 ? parts.join(" · ") : "ยังไม่กำหนดขอบเขต";
}

const pageMenuItem = (
  id: string,
  route: keyof typeof PAGE_IDENTITIES,
  permissionId?: string | string[],
): MenuItem => ({
  id,
  label: PAGE_IDENTITIES[route].title,
  iconName: PAGE_IDENTITIES[route].iconName,
  permissionId,
  route,
});

export const MENU_ITEMS: MenuItem[] = [
  pageMenuItem("home", "/"),
  pageMenuItem("dashboard", "/student-risk-report"),
  pageMenuItem("students", "/students"),
  pageMenuItem("classrooms", "/classrooms", "manage-school-structure"),
  {
    id: "case-system",
    label: "งานติดตามเคส",
    iconName: "folder-heart",
    children: [
      {
        ...pageMenuItem("review-cases", "/cases"),
      },
      {
        ...pageMenuItem("visit-links", "/visit-links", "review-cases"),
      },
    ],
  },
  pageMenuItem("student-self", "/my-attendance"),
  pageMenuItem("create", "/create"),
  {
    id: "data-management",
    label: "จัดการข้อมูล",
    iconName: "file-spreadsheet",
    children: [
      {
        ...pageMenuItem("manage-school-structure", "/school-structure"),
      },
      {
        ...pageMenuItem("import-data", "/import-data"),
      },
      {
        ...pageMenuItem("export-data", "/data-exports"),
      },
    ],
  },
  {
    id: "attendance-system",
    label: "ระบบเช็คชื่อ",
    iconName: "calendar-check",
    children: [
      {
        ...pageMenuItem("attendance", "/attendance"),
      },
      {
        ...pageMenuItem("attendance-dashboard", "/attendance-links"),
      },
      {
        ...pageMenuItem("attendance-operations", "/attendance-operations", "attendance-dashboard"),
      },
      {
        ...pageMenuItem("timetable", "/timetable", ["home", "student-self"]),
      },
    ],
  },
  {
    id: "manage-users",
    label: "จัดการสิทธิ์ผู้ใช้งาน",
    iconName: "users-cog",
    children: [
      {
        ...pageMenuItem("manage-users-list", "/manage-users"),
      },
      {
        ...pageMenuItem("manage-role-groups", "/manage-role-groups"),
      },
    ],
  },
  {
    id: "recruitment-system",
    label: "ระบบรับสมัคร",
    iconName: "users-round",
    permissionId: "field-monitor",
    children: [
      {
        ...pageMenuItem("field-followers", "/field-followers", "field-monitor"),
      },
      {
        ...pageMenuItem("field-followers-review", "/field-follower-applications", "field-monitor"),
      },
    ],
  },
  pageMenuItem("field-monitor-map", "/field-monitor-map", "field-monitor"),
  pageMenuItem("settings", "/settings"),
];

export function getEffectivePermissions(
  roles: string[],
  customPermissions: string[] = [],
): string[] {
  const isRestrictedExecutive =
    roles.includes("EXECUTIVE") &&
    !roles.some((role) => role === "ADMIN" || role === "DIRECTOR");
  if (isRestrictedExecutive) {
    const hasWildcard = customPermissions.some(
      (permission) => permission === "*" || permission === "ALL",
    );
    return hasWildcard
      ? [...EXECUTIVE_ALLOWED_PERMISSIONS]
      : customPermissions.filter((permission) =>
          EXECUTIVE_ALLOWED_PERMISSIONS.includes(
            permission as (typeof EXECUTIVE_ALLOWED_PERMISSIONS)[number],
          ),
        );
  }

  const roleDefaults = roles.some((role) => role === "ADMIN" || role === "DIRECTOR")
    ? ["edit-students", "export-data"]
    : [];
  return Array.from(new Set([...customPermissions, ...roleDefaults]));
}

export function isStudentOnlyRole(roles: string[]): boolean {
  // Any non-STUDENT role (system or custom role group) means a staff session.
  return roles.length > 0 && roles.every((role) => role === "STUDENT");
}

interface StudentSelfSessionLike {
  virtual_login?: boolean;
  virtual_auth_token?: string;
  permissions?: string[];
  data_scope?: DataScope;
}

export function isStudentSelfSession(
  user: StudentSelfSessionLike | null | undefined,
): boolean {
  return Boolean(
    user?.virtual_login &&
      user.virtual_auth_token &&
      user.permissions?.includes("student-self") &&
      user.data_scope?.own_only,
  );
}

export function hasPermission(
  userPermissions: string[],
  permissionId: string,
): boolean {
  return (
    userPermissions.includes("ADMIN") ||
    userPermissions.includes("*") ||
    userPermissions.includes("ALL") ||
    userPermissions.includes(permissionId)
  );
}

export function filterMenuItems(
  menuItems: MenuItem[],
  userPermissions: string[],
): MenuItem[] {
  const canAccessItem = (item: MenuItem): boolean => {
    const requiredPermissions = item.permissionId ?? item.id;
    return Array.isArray(requiredPermissions)
      ? requiredPermissions.some((permissionId) => hasPermission(userPermissions, permissionId))
      : hasPermission(userPermissions, requiredPermissions);
  };

  return menuItems
    .map((item) => {
      if (item.children) {
        const filteredChildren = item.children.filter(canAccessItem);
        return filteredChildren.length > 0
          ? { ...item, children: filteredChildren }
          : null;
      }

      return canAccessItem(item) ? item : null;
    })
    .filter((item): item is MenuItem => item !== null);
}

export function getFirstAccessibleRoute(userPermissions: string[]): string {
  const filteredMenuItems = filterMenuItems(MENU_ITEMS, userPermissions);

  for (const item of filteredMenuItems) {
    if (item.route) {
      return item.route;
    }

    const firstChildRoute = item.children?.find((child) => child.route)?.route;
    if (firstChildRoute) {
      return firstChildRoute;
    }
  }

  return "/forbidden";
}

export function getLeafMenuItems(menuItems: MenuItem[] = MENU_ITEMS): MenuItem[] {
  return menuItems.flatMap((item) =>
    item.children && item.children.length > 0
      ? getLeafMenuItems(item.children)
      : [item],
  );
}
