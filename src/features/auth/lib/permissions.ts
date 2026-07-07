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

export interface MenuItem {
  id: string;
  label: string;
  iconName?: string;
  permissionId?: string;
  route?: string;
  children?: MenuItem[];
}

export const GRANT_EXEMPT_PERMISSION_IDS = ["student-self"] as const;

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
  if (scope.grade_levels?.length) parts.push(`ระดับชั้น: ${scope.grade_levels.join(", ")}`);
  if (scope.room_ids?.length) parts.push(`ห้อง: ${scope.room_ids.join(", ")}`);

  return parts.length > 0 ? parts.join(" · ") : "ยังไม่กำหนดขอบเขต";
}

export const MENU_ITEMS: MenuItem[] = [
  { id: "home", label: "หน้าหลัก", iconName: "home", route: "/" },
  {
    id: "dashboard",
    label: "รายงานนักเรียน",
    iconName: "chart-line",
    route: "/dashboard",
  },
  {
    id: "students",
    label: "รายชื่อนักเรียน",
    iconName: "user-graduate",
    route: "/students",
  },
  {
    id: "review-cases",
    label: "เคสช่วยเหลือ",
    iconName: "heart-handshake",
    route: "/cases",
  },
  {
    id: "student-self",
    label: "ข้อมูลตัวเอง",
    iconName: "user-circle",
    route: "/my-attendance",
  },
  {
    id: "create",
    label: "สร้างลิงก์",
    iconName: "link",
    route: "/create",
  },
  {
    id: "import-data",
    label: "นำเข้าข้อมูล",
    iconName: "file-import",
    route: "/import-data",
  },
  {
    id: "attendance-system",
    label: "ระบบเช็คชื่อ",
    iconName: "clipboard-check",
    children: [
      {
        id: "attendance",
        label: "เช็คชื่อ",
        iconName: "edit",
        route: "/attendance",
      },
      {
        id: "attendance-dashboard",
        label: "ลิงก์เช็คชื่อ",
        iconName: "chart-bar",
        route: "/attendance-dashboard",
      },
      {
        id: "attendance-operations",
        label: "ความครบถ้วน",
        iconName: "clipboard-check",
        permissionId: "attendance-dashboard",
        route: "/attendance-operations",
      },
      {
        id: "timetable",
        label: "ตารางสอน",
        iconName: "calendar",
        permissionId: "home",
        route: "/timetable",
      },
    ],
  },
  {
    id: "manage-users",
    label: "จัดการสิทธิ์ผู้ใช้งาน",
    iconName: "users-cog",
    children: [
      {
        id: "manage-users-list",
        label: "จัดการรายชื่อผู้ใช้งาน",
        iconName: "users",
        route: "/manage-users",
      },
      {
        id: "manage-student-accounts",
        label: "บัญชีนักเรียน",
        iconName: "user-plus",
        route: "/manage-student-accounts",
      },
      {
        id: "manage-role-groups",
        label: "จัดการกลุ่มผู้ใช้งาน",
        iconName: "user-tag",
        route: "/manage-role-groups",
      },
      {
        id: "login-links",
        label: "ลิงก์เข้าสู่ระบบ",
        iconName: "link",
        route: "/login-links",
      },
    ],
  },
  {
    id: "field-followers",
    label: "ผู้สมัคร อสม./ผู้ติดตาม",
    iconName: "user-check",
    permissionId: "field-monitor",
    route: "/field-followers",
  },
  {
    id: "field-monitor-map",
    label: "แผนที่เด็กเสี่ยง",
    iconName: "map-pin",
    permissionId: "field-monitor",
    route: "/field-monitor-map",
  },
  {
    id: "work-session-monitor",
    label: "ติดตามช่วงปฏิบัติงาน",
    iconName: "activity",
    permissionId: "field-monitor",
    route: "/work-session-monitor",
  },
  {
    id: "settings",
    label: "ตั้งค่าระบบ",
    iconName: "settings",
    route: "/settings",
  },
];

export function getEffectivePermissions(
  roles: string[],
  customPermissions: string[] = [],
): string[] {
  const roleDefaults = roles.some((role) => role === "ADMIN" || role === "DIRECTOR")
    ? ["edit-students"]
    : [];
  return Array.from(new Set([...customPermissions, ...roleDefaults]));
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
  return menuItems
    .map((item) => {
      if (item.children) {
        const filteredChildren = item.children.filter((child) =>
          hasPermission(userPermissions, child.permissionId ?? child.id),
        );
        return filteredChildren.length > 0
          ? { ...item, children: filteredChildren }
          : null;
      }

      return hasPermission(userPermissions, item.permissionId ?? item.id) ? item : null;
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
