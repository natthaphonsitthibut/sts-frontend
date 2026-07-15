import { PAGE_IDENTITIES } from "./page-identity";

const MENU_TITLES = Object.fromEntries(
  Object.entries(PAGE_IDENTITIES).map(([route, identity]) => [route, identity.title]),
);

/** Routes not present in the sidebar menu still need a header title. */
const EXTRA_TITLES: Record<string, string> = {
  "/cases": "เคสช่วยเหลือนักเรียน",
  "/profile": "โปรไฟล์ของฉัน",
  "/notifications": "การแจ้งเตือน",
  "/login": "เข้าสู่ระบบ",
  "/audit-log": "รายละเอียดบันทึกการใช้งาน",
  "/forbidden": "ไม่มีสิทธิ์เข้าถึง",
};

export function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/tasks/")) {
    return "รายละเอียดภารกิจ";
  }

  if (pathname.startsWith("/students/")) {
    return "ข้อมูลนักเรียน";
  }

  if (pathname.startsWith("/audit-log/")) {
    return EXTRA_TITLES["/audit-log"];
  }

  // /create/:type (per task type) keeps the same header as the /create menu item.
  if (pathname.startsWith("/create")) {
    return MENU_TITLES["/create"] || "สร้างลิงก์";
  }

  const exactTitle = MENU_TITLES[pathname] || EXTRA_TITLES[pathname];
  if (exactTitle) return exactTitle;

  if (/^\/field-followers\/[^/]+$/.test(pathname)) {
    return "รายละเอียดใบสมัคร";
  }

  const parentRoute = [...Object.keys(MENU_TITLES), ...Object.keys(EXTRA_TITLES)]
    .filter((route) => route !== "/" && pathname.startsWith(`${route}/`))
    .sort((left, right) => right.length - left.length)[0];

  return parentRoute
    ? MENU_TITLES[parentRoute] || EXTRA_TITLES[parentRoute]
    : "Student Tracking System";
}
