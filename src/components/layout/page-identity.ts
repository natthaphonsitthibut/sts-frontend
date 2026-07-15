import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Calendar,
  CalendarCheck,
  ChartNoAxesColumn,
  ClipboardCheck,
  Download,
  Edit3,
  FileInput,
  FileSpreadsheet,
  FolderHeart,
  GraduationCap,
  HeartHandshake,
  Home,
  KeyRound,
  Link,
  Link2,
  MapPin,
  Send,
  Settings,
  UserCheck,
  UserCircle,
  UserCog,
  UserPlus,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";

export const PAGE_ICONS = {
  activity: Activity,
  calendar: Calendar,
  "calendar-check": CalendarCheck,
  "chart-bar": BarChart3,
  "chart-line": ChartNoAxesColumn,
  "clipboard-check": ClipboardCheck,
  download: Download,
  edit: Edit3,
  "file-import": FileInput,
  "file-spreadsheet": FileSpreadsheet,
  "folder-heart": FolderHeart,
  graduation: GraduationCap,
  "heart-handshake": HeartHandshake,
  home: Home,
  "key-round": KeyRound,
  link: Link,
  "link-plus": Link2,
  "map-pin": MapPin,
  send: Send,
  settings: Settings,
  "user-check": UserCheck,
  "user-circle": UserCircle,
  "user-graduate": UserRound,
  "user-plus": UserPlus,
  "users-cog": UserCog,
  users: Users,
  "users-round": UsersRound,
} satisfies Record<string, LucideIcon>;

export type PageIconName = keyof typeof PAGE_ICONS;

export interface PageIdentity {
  icon: LucideIcon;
  iconName: PageIconName;
  title: string;
}

const createIdentity = (title: string, iconName: PageIconName): PageIdentity => ({
  icon: PAGE_ICONS[iconName],
  iconName,
  title,
});

/**
 * Canonical identity for leaf routes that appear in the sidebar menu.
 * Routes outside this map are intentionally out-of-menu and may retain a
 * context-specific title and icon (for example detail and form pages).
 */
export const PAGE_IDENTITIES = {
  "/": createIdentity("หน้าหลัก", "home"),
  "/attendance": createIdentity("เช็คชื่อ", "edit"),
  "/attendance-links": createIdentity("ลิงก์เช็คชื่อ", "clipboard-check"),
  "/attendance-operations": createIdentity("ความครบถ้วน", "calendar-check"),
  "/cases": createIdentity("เคสช่วยเหลือ", "heart-handshake"),
  "/create": createIdentity("สร้างลิงก์", "link-plus"),
  "/data-exports": createIdentity("ส่งออกข้อมูล", "download"),
  "/executive-reporting": createIdentity("รายงานภาพรวมผู้บริหาร", "chart-bar"),
  "/field-follower-applications": createIdentity("ตรวจสอบใบสมัคร", "user-check"),
  "/field-followers": createIdentity("ลิงก์รับสมัคร", "send"),
  "/field-monitor-map": createIdentity("แผนที่เด็กเสี่ยง", "map-pin"),
  "/import-data": createIdentity("นำเข้าข้อมูล", "file-import"),
  "/login-links": createIdentity("ลิงก์เข้าใช้งาน", "link"),
  "/login-links/teacher": createIdentity("ลิงก์เข้าใช้งาน", "link"),
  "/manage-role-groups": createIdentity("จัดการกลุ่มผู้ใช้งาน", "users-cog"),
  "/manage-student-accounts": createIdentity("บัญชีนักเรียน", "user-plus"),
  "/manage-users": createIdentity("จัดการรายชื่อผู้ใช้งาน", "users"),
  "/my-attendance": createIdentity("ข้อมูลตัวเอง", "user-circle"),
  "/school-structure": createIdentity("โครงสร้างโรงเรียน", "graduation"),
  "/settings": createIdentity("ตั้งค่าระบบ", "settings"),
  "/student-risk-report": createIdentity("รายงานนักเรียน", "chart-line"),
  "/students": createIdentity("รายชื่อนักเรียน", "user-graduate"),
  "/teacher-access-grants": createIdentity("ลิงก์เข้าใช้งานครู", "key-round"),
  "/timetable": createIdentity("ตารางสอน", "calendar"),
  "/visit-links": createIdentity("ลิงก์ลงพื้นที่", "map-pin"),
  "/work-session-monitor": createIdentity("ติดตามช่วงปฏิบัติงาน", "activity"),
} as const satisfies Record<string, PageIdentity>;

export function getPageIdentity(pathname: string): PageIdentity | undefined {
  return PAGE_IDENTITIES[pathname as keyof typeof PAGE_IDENTITIES];
}
