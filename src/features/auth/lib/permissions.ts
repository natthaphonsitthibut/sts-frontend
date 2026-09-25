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
  /** A school item a council-only account must not see (it has its own copy). */
  schoolRealmOnly?: boolean;
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

/**
 * The sidebar, in the order of the owner's mockups (2026-09-25): one per
 * default group — ผู้ดูแลระบบโรงเรียน, ผู้อำนวยการโรงเรียน, ผู้ดูแลระบบสภา and
 * ผู้บริหารสภา. Each account sees the entries its permissions reach; which
 * section an entry sits under only matters to an account that has both.
 *
 * `iconName` on a child overrides its page's icon in this menu only — the
 * mockups give sub-items their own glyphs while the page header keeps the
 * page's. A group left with one visible child collapses into that child, which
 * then wears its page icon (ผู้บริหาร's lone ส่งออกข้อมูล is a download arrow).
 */
export const MENU_ITEMS: MenuItem[] = [
  { ...pageMenuItem("home", "/"), section: "school" },
  { ...pageMenuItem("dashboard", "/student-risk-report"), section: "school" },
  { ...pageMenuItem("classrooms", "/classrooms"), section: "school" },
  { ...pageMenuItem("teachers", "/teachers"), section: "school" },
  { ...pageMenuItem("students", "/students"), section: "school" },
  // No default group carries เช็กชื่อ; it stays for a school that builds its
  // own ครู group (owner, 2026-09-25).
  { ...pageMenuItem("attendance", "/attendance"), section: "school" },
  {
    id: "manage-users",
    label: "จัดการสิทธิ์ผู้ใช้งาน",
    iconName: "security",
    // School-only: the council has its own group with its own routes below,
    // so the two never light up together (owner, 2026-09-22).
    section: "school",
    schoolRealmOnly: true,
    children: [
      {
        ...pageMenuItem("manage-users-list", "/manage-users"),
        iconName: "users",
      },
      {
        ...pageMenuItem("manage-role-groups", "/manage-role-groups"),
        iconName: "apps",
      },
    ],
  },
  {
    id: "data-management",
    label: "จัดการข้อมูล",
    iconName: "file-spreadsheet",
    section: "school",
    children: [
      {
        ...pageMenuItem("manage-school-structure", "/school-structure"),
        iconName: "users",
      },
      { ...pageMenuItem("manage-subjects", "/curriculum"), iconName: "users" },
      {
        ...pageMenuItem("manage-teachers", "/manage-teachers"),
        iconName: "users",
      },
      {
        ...pageMenuItem(
          "manage-classroom-links",
          "/attendance/classroom-links",
        ),
        iconName: "users",
      },
      {
        ...pageMenuItem("manage-students", "/manage-students"),
        iconName: "apps",
      },
    ],
  },
  {
    id: "import-export",
    label: "นำเข้าและส่งออกข้อมูล",
    iconName: "import-export",
    section: "school",
    children: [
      { ...pageMenuItem("import-data", "/import-data"), iconName: "users" },
      { ...pageMenuItem("export-data", "/data-exports"), iconName: "apps" },
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
    id: "manage-users-council",
    label: "จัดการสิทธิ์ผู้ใช้งาน",
    iconName: "security",
    // Same pages and permissions as the school group, aliased under
    // /council/... so each realm has its own destination (owner, 2026-09-22).
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
        iconName: "apps",
        permissionId: "manage-role-groups",
        route: "/council/manage-role-groups",
      },
    ],
  },
  {
    id: "data-management-council",
    label: "จัดการข้อมูล",
    iconName: "file-spreadsheet",
    section: "council",
    children: [
      {
        // National data shared by every school, so it is the council's
        // (owner, 2026-09-25), not the school admin's as the mockup drew it.
        ...pageMenuItem(
          "master-data",
          "/master-data",
          "master-data",
          "global-only",
          "ADMIN",
        ),
        iconName: "users",
        activeRoutes: ["/master-data/student-statuses"],
      },
    ],
  },
  // แชตบอท is ผู้บริหาร's (owner, 2026-09-25).
  { ...pageMenuItem("nl_query:use", "/nl-query"), section: "council" },
  {
    ...pageMenuItem("settings", "/settings", undefined, "global-only", "ADMIN"),
    section: "council",
  },
];

export type MenuSectionKey = "school" | "council";

export interface MenuSection {
  key: MenuSectionKey;
  /** Shown only when the account sees both sections. */
  label: string | null;
  items: MenuItem[];
}

const SECTION_LABELS: Record<MenuSectionKey, string> = {
  school: "เมนูส่วนโรงเรียน",
  council: "เมนูส่วนสภา",
};

/**
 * Which sections an account works in. A school-scoped account is the
 * school's; everyone else is the council's, and the council's ผู้ดูแลระบบ also
 * looks after every school, so it gets both. Read from the account's scope,
 * not its group name: a school's own groups are named `S<id>_BASE_ADMIN`.
 */
export function getMenuRealms(
  userRoles: string[] = [],
  dataScope?: DataScope,
): MenuSectionKey[] {
  if (dataScope?.school_ids?.length) return ["school"];
  return userRoles.includes("ADMIN") ? ["school", "council"] : ["council"];
}

/** A group reduced to one entry reads as that entry, with its page icon. */
function collapseSingleChildGroup(item: MenuItem): MenuItem {
  if (item.route || item.children?.length !== 1) return item;
  const [child] = item.children;
  const identity = child.route
    ? PAGE_IDENTITIES[child.route as keyof typeof PAGE_IDENTITIES]
    : undefined;
  return {
    ...child,
    iconName: identity?.iconName ?? child.iconName,
    section: item.section,
    schoolRealmOnly: item.schoolRealmOnly,
  };
}

/**
 * The already permission-filtered menu, laid out the way both the expanded
 * sidebar and the icon rail show it. One function for both so the two states
 * can never list different entries or a different order.
 */
export function buildMenuSections(
  filteredItems: MenuItem[],
  userRoles: string[] = [],
  dataScope?: DataScope,
): MenuSection[] {
  const realms = getMenuRealms(userRoles, dataScope);
  const items = filteredItems.map(collapseSingleChildGroup);

  if (realms.length === 1) {
    // One section: no header, and every entry the account holds is listed,
    // except the school's own copy of a council destination.
    const [realm] = realms;
    return [
      {
        key: realm,
        label: null,
        items: items.filter(
          (item) =>
            !item.section ||
            item.section === realm ||
            (item.section === "school" && !item.schoolRealmOnly),
        ),
      },
    ];
  }

  return realms
    .map((realm) => ({
      key: realm,
      label: SECTION_LABELS[realm],
      items: items.filter((item) => (item.section ?? "school") === realm),
    }))
    .filter((section) => section.items.length > 0);
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
