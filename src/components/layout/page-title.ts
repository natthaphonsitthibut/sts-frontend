import { MENU_ITEMS, type MenuItem } from "../../features/auth/lib/permissions";

/**
 * Topbar title is derived from the sidebar MENU_ITEMS so the header title always
 * matches the menu label — no hand-maintained duplicate map that can drift.
 */
function collectMenuTitles(
  items: MenuItem[],
  acc: Record<string, string>,
): void {
  for (const item of items) {
    if (item.route) {
      acc[item.route] = item.label;
    }
    if (item.children) {
      collectMenuTitles(item.children, acc);
    }
  }
}

const MENU_TITLES: Record<string, string> = {};
collectMenuTitles(MENU_ITEMS, MENU_TITLES);

/** Routes not present in the sidebar menu still need a header title. */
const EXTRA_TITLES: Record<string, string> = {
  "/cases": "เคสช่วยเหลือนักเรียน",
  "/admin-access": "เข้าสู่ระบบ",
  "/audit-log": "รายละเอียดบันทึกการใช้งาน",
  "/forbidden": "ไม่มีสิทธิ์เข้าถึง",
};

export function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/task-detail/")) {
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

  return MENU_TITLES[pathname] || EXTRA_TITLES[pathname] || "Student Tracking System";
}
