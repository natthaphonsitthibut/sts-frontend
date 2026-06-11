const PAGE_TITLES: Record<string, string> = {
  "/": "หน้าหลัก",
  "/dashboard": "รายงานนักเรียน",
  "/students": "รายชื่อนักเรียน",
  "/create": "สร้างภารกิจใหม่",
  "/import-data": "นำเข้าข้อมูล",
  "/attendance": "เช็คชื่อ",
  "/attendance-dashboard": "Dashboard เช็คชื่อ",
  "/admin-access": "Admin Access",
  "/manage-users": "จัดการผู้ใช้งาน",
  "/manage-role-groups": "จัดการกลุ่มผู้ใช้งาน",
  "/settings": "ตั้งค่าระบบและข้อมูลพื้นฐาน",
  "/my-attendance": "ข้อมูลการเข้าเรียนของฉัน",
  "/forbidden": "ไม่มีสิทธิ์เข้าถึง",
};

export function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/task-detail/")) {
    return "รายละเอียดเคส";
  }

  if (pathname.startsWith("/students/")) {
    return "ข้อมูลนักเรียน";
  }

  return PAGE_TITLES[pathname] || "Student Tracking System";
}
