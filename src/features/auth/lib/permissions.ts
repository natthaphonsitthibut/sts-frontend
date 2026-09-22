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
  /** Which sidebar realm a top-level item belongs under. */
  section?: "school" | "council";
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
  // Owner override (2026-09-22): "หน้าหลักให้เป็นเมนูส่วน รร นะ" — a plain
  // school-section item. A pure EXECUTIVE
  // account (COUNCIL_SECTION_ROLES only) loses the sidebar link for it, but
  // keeps ถามข้อมูลด้วยภาษาไทย under เมนูส่วนสภา and still lands on a working
  // route on sign-in either way (routing doesn't depend on the sidebar) — a
  // cosmetic gap, not a dead end.
  { ...pageMenuItem("home", "/"), section: "school" },
  { ...pageMenuItem("dashboard", "/student-risk-report"), section: "school" },
  { ...pageMenuItem("students", "/students"), section: "school" },
  { ...pageMenuItem("teachers", "/teachers"), section: "school" },
  { ...pageMenuItem("classrooms", "/classrooms"), section: "school" },
  { ...pageMenuItem("nl_query:use", "/nl-query"), section: "council" },
  {
    id: "data-management",
    label: "จัดการข้อมูล",
    iconName: "file-spreadsheet",
    section: "school",
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
    section: "school",
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
    // นักเรียน/ครู เป็นของโรงเรียนอย่างเดียว (owner, 2026-09-22) — this group
    // stays school-only; the council side gets its own group below.
    section: "school",
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
  {
    id: "manage-users-council",
    label: "จัดการสิทธิ์ผู้ใช้งาน",
    iconName: "users-cog",
    // Council's own "จัดการผู้ใช้งาน"/"จัดการกลุ่มเมนู" (owner, 2026-09-22:
    // "สภา น่าจะมีแค่ ผู้ใช้งาน กับ กลุ่มเมนู") — aliased under /council/... so
    // this is a genuinely separate destination from the school group above,
    // not the same link lit up active in both sections at once. Same pages,
    // same permissions; each already scopes its data to the viewer's own
    // data_scope, so a council-scoped account sees its wider scope here and a
    // school-scoped account sees the school one above.
    section: "council",
    children: [
      {
        id: "manage-users-list-council",
        label: "จัดการผู้ใช้งาน",
        iconName: "users",
        permissionId: "manage-users-list",
        route: "/council/manage-users",
      },
      {
        id: "manage-role-groups-council",
        label: "จัดการกลุ่มเมนู",
        iconName: "users-cog",
        permissionId: "manage-role-groups",
        route: "/council/manage-role-groups",
      },
    ],
  },
  {
    ...pageMenuItem(
      "manage-schools",
      "/manage-schools",
      undefined,
      "global-only",
      "ADMIN",
    ),
    section: "council",
  },
  {
    ...pageMenuItem("settings", "/settings", undefined, "global-only", "ADMIN"),
    section: "council",
  },
];

// Which roles get which sidebar realm at all — the owner's spec (2026-09-22):
// "สภา (ผู้ดูแลระบบ, ผู้บริหาร) โรงเรียน (ผู้ดูแลระบบ, ผอ.) default ไว้เท่านี้"
// This is coarser than, and on top of, the existing per-item permission
// filtering below: a DIRECTOR holds `manage-users-list` (their own school
// needs it) which happens to be the same permission id the council group's
// "จัดการผู้ใช้งาน" child checks, so permission filtering alone would leak
// "เมนูส่วนสภา" into a DIRECTOR's sidebar. This role gate is what keeps a
// realm hidden for a role that was never meant to see it, regardless of which
// individual permissions that account happens to carry.
const SCHOOL_SECTION_ROLES = ["ADMIN", "DIRECTOR"];
const COUNCIL_SECTION_ROLES = ["ADMIN", "EXECUTIVE"];

/**
 * Splits the already permission-filtered menu into the two sidebar realms.
 * `home` is a plain school-section item (owner, 2026-09-22) — it does not get
 * special-cased here.
 */
export function groupMenuItemsBySection(
  filteredItems: MenuItem[],
  userRoles: string[] = [],
): {
  school: MenuItem[];
  council: MenuItem[];
} {
  const showSchool = userRoles.some((role) =>
    SCHOOL_SECTION_ROLES.includes(role),
  );
  const showCouncil = userRoles.some((role) =>
    COUNCIL_SECTION_ROLES.includes(role),
  );
  const school: MenuItem[] = [];
  const council: MenuItem[] = [];
  for (const item of filteredItems) {
    if (showSchool && item.section === "school") school.push(item);
    if (showCouncil && item.section === "council") council.push(item);
  }
  return { school, council };
}

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
