export interface DataScope {
  provinces?: string[];
  districts?: string[];
  sub_districts?: string[];
  school_ids?: number[];
  grade_levels?: number[];
  room_ids?: Array<number | string>;
  own_only?: boolean;
}

export interface MenuItem {
  id: string;
  label: string;
  iconName?: string;
  route?: string;
  children?: MenuItem[];
}

export const GRANT_EXEMPT_PERMISSION_IDS = ["student-self"] as const;

export const ROLE_RANKS: Record<string, number> = {
  STUDENT: 1,
  TEACHER: 2,
  EXECUTIVE: 3,
  DIRECTOR: 4,
  ADMIN_SCHOOL: 5,
  ADMIN_SUBDISTRICT: 6,
  ADMIN_DISTRICT: 7,
  ADMIN_PROVINCE: 8,
  ADMIN: 9,
};

export const ROLE_BASELINES: Record<string, string[]> = {
  ADMIN: [
    "home",
    "dashboard",
    "students",
    "create",
    "attendance",
    "attendance-dashboard",
    "manage-users-list",
    "manage-role-groups",
    "login-links",
    "settings",
    "import-data",
  ],
  ADMIN_PROVINCE: [
    "home",
    "dashboard",
    "students",
    "create",
    "attendance",
    "attendance-dashboard",
    "manage-users-list",
    "login-links",
  ],
  ADMIN_DISTRICT: [
    "home",
    "dashboard",
    "students",
    "create",
    "attendance",
    "attendance-dashboard",
    "manage-users-list",
    "login-links",
  ],
  ADMIN_SUBDISTRICT: [
    "home",
    "dashboard",
    "students",
    "create",
    "attendance",
    "attendance-dashboard",
    "manage-users-list",
    "login-links",
  ],
  ADMIN_SCHOOL: [
    "home",
    "dashboard",
    "students",
    "create",
    "attendance",
    "attendance-dashboard",
    "manage-users-list",
    "login-links",
  ],
  DIRECTOR: [
    "home",
    "dashboard",
    "students",
    "create",
    "attendance",
    "attendance-dashboard",
    "manage-users-list",
    "login-links",
    "settings",
  ],
  EXECUTIVE: ["home", "dashboard", "students", "attendance-dashboard"],
  TEACHER: ["home", "students", "attendance"],
  STUDENT: ["home", "student-self"],
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  ADMIN_PROVINCE: "แอดมินระดับจังหวัด",
  ADMIN_DISTRICT: "แอดมินระดับอำเภอ",
  ADMIN_SUBDISTRICT: "แอดมินระดับตำบล",
  ADMIN_SCHOOL: "แอดมินระดับโรงเรียน",
  DIRECTOR: "ผู้อำนวยการ",
  EXECUTIVE: "ผู้บริหาร",
  TEACHER: "คุณครู",
  STUDENT: "นักเรียน",
};

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
    id: "student-self",
    label: "ข้อมูลตัวเอง",
    iconName: "user-circle",
    route: "/my-attendance",
  },
  { id: "create", label: "สร้างลิงค์", iconName: "link", route: "/create" },
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
        id: "attendance-dashboard",
        label: "Dashboard เช็คชื่อ",
        iconName: "chart-bar",
        route: "/attendance-dashboard",
      },
      {
        id: "attendance",
        label: "เช็คชื่อ",
        iconName: "edit",
        route: "/attendance",
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
    id: "settings",
    label: "ตั้งค่าระบบ (Master Data)",
    iconName: "settings",
    route: "/settings",
  },
];

export function getEffectivePermissions(
  roles: string[],
  customPermissions: string[] = [],
): string[] {
  const rolePermissions = roles.flatMap((role) => ROLE_BASELINES[role] ?? []);
  return Array.from(new Set([...rolePermissions, ...customPermissions]));
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
          hasPermission(userPermissions, child.id),
        );
        return filteredChildren.length > 0
          ? { ...item, children: filteredChildren }
          : null;
      }

      return hasPermission(userPermissions, item.id) ? item : null;
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
