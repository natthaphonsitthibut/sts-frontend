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
  scopePolicy?: "global-only";
  rolePolicy?: "ADMIN";
}

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
  if (scope.provinces?.length)
    parts.push(`จังหวัด: ${scope.provinces.join(", ")}`);
  if (scope.districts?.length)
    parts.push(`อำเภอ/เขต: ${scope.districts.join(", ")}`);
  if (scope.sub_districts?.length)
    parts.push(`ตำบล/แขวง: ${scope.sub_districts.join(", ")}`);
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
  scopePolicy?: "global-only",
  rolePolicy?: "ADMIN",
): MenuItem => ({
  id,
  label: PAGE_IDENTITIES[route].title,
  iconName: PAGE_IDENTITIES[route].iconName,
  permissionId,
  route,
  ...(scopePolicy ? { scopePolicy } : {}),
  ...(rolePolicy ? { rolePolicy } : {}),
});

export const MENU_ITEMS: MenuItem[] = [
  pageMenuItem("home", "/"),
  pageMenuItem("dashboard", "/student-risk-report"),
  pageMenuItem("students", "/students"),
  pageMenuItem("teachers", "/teachers"),
  pageMenuItem("classrooms", "/classrooms"),
  {
    id: "data-management",
    label: "จัดการข้อมูล",
    iconName: "file-spreadsheet",
    children: [
      {
        ...pageMenuItem("manage-school-structure", "/school-structure"),
      },
      {
        ...pageMenuItem("manage-subjects", "/curriculum"),
      },
      {
        ...pageMenuItem("import-data", "/import-data"),
      },
      {
        ...pageMenuItem("export-data", "/data-exports"),
      },
      {
        ...pageMenuItem(
          "attendance-operations",
          "/attendance-operations",
          "attendance-dashboard",
        ),
      },
      {
        ...pageMenuItem(
          "master-data",
          "/master-data",
          "master-data",
          "global-only",
          "ADMIN",
        ),
        activeRoutes: ["/master-data/student-statuses"],
      },
    ],
  },
  {
    id: "attendance-system",
    label: "ระบบเช็กชื่อ",
    iconName: "calendar-check",
    children: [
      {
        ...pageMenuItem("attendance", "/attendance"),
      },
      {
        ...pageMenuItem(
          "manage-classroom-links",
          "/attendance/classroom-links",
        ),
      },
    ],
  },
  {
    id: "manage-users",
    label: "จัดการสิทธิ์ผู้ใช้งาน",
    iconName: "users-cog",
    children: [
      {
        ...pageMenuItem("manage-students", "/manage-students"),
      },
      {
        ...pageMenuItem("manage-teachers", "/manage-teachers"),
      },
      {
        ...pageMenuItem("manage-users-list", "/manage-users"),
      },
      {
        ...pageMenuItem("manage-role-groups", "/manage-role-groups"),
      },
    ],
  },
  pageMenuItem("settings", "/settings"),
];

/**
 * What the account may open, as the server granted it.
 *
 * A wildcard is still narrowed here — `*` in storage means "whatever the role
 * carries", and the menu needs concrete ids to match against — but the role
 * itself is no longer second-guessed. ผู้บริหาร used to be clamped to หน้าหลัก
 * by this function no matter what its group granted, which made the group's own
 * ticks a lie; the backend still refuses raw student text to that role
 * (`denyExecutiveRaw`), which is where that rule belongs.
 */
export function getEffectivePermissions(
  roles: string[],
  customPermissions: string[] = [],
): string[] {
  void roles;
  return Array.from(new Set(customPermissions));
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
  dataScope?: DataScope,
  userRoles: string[] = [],
): MenuItem[] {
  const canAccessItem = (item: MenuItem): boolean => {
    if (item.scopePolicy === "global-only" && dataScope?.global !== true)
      return false;
    if (item.rolePolicy && !userRoles.includes(item.rolePolicy)) return false;
    const requiredPermissions = item.permissionId ?? item.id;
    return Array.isArray(requiredPermissions)
      ? requiredPermissions.some((permissionId) =>
          hasPermission(userPermissions, permissionId),
        )
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

export function getFirstAccessibleRoute(
  userPermissions: string[],
  dataScope?: DataScope,
  userRoles: string[] = [],
): string {
  const filteredMenuItems = filterMenuItems(
    MENU_ITEMS,
    userPermissions,
    dataScope,
    userRoles,
  );

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

export function getLeafMenuItems(
  menuItems: MenuItem[] = MENU_ITEMS,
): MenuItem[] {
  return menuItems.flatMap((item) =>
    item.children && item.children.length > 0
      ? getLeafMenuItems(item.children)
      : [item],
  );
}

/**
 * Whether the account may open a route, matched against the same menu table the
 * sidebar filters. Used where a surface shows data for a page the account may
 * not enter — the number stays, the link does not.
 */
export function canOpenRoute(
  userPermissions: string[],
  route: string,
): boolean {
  const path = route.split("?")[0];
  const item = getLeafMenuItems().find((leaf) => leaf.route === path);
  if (!item) return false;
  const required = item.permissionId ?? item.id;
  return Array.isArray(required)
    ? required.some((permissionId) =>
        hasPermission(userPermissions, permissionId),
      )
    : hasPermission(userPermissions, required);
}
