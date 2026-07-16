import type { LucideIcon } from "lucide-react";
import {
  AccountCircleIcon,
  AddLinkIcon,
  AssignmentTurnedInIcon,
  CalendarTodayIcon,
  EditIcon,
  EqualizerIcon,
  EventAvailableIcon,
  FileDownloadIcon,
  FolderSpecialIcon,
  GroupIcon,
  GroupsIcon,
  HomeIcon,
  HowToRegIcon,
  LinkIcon,
  ManageAccountsIcon,
  PersonAddIcon,
  PersonIcon,
  PlaceIcon,
  SchoolIcon,
  SendIcon,
  SettingsIcon,
  TableChartIcon,
  UploadFileIcon,
  VolunteerActivismIcon,
  VpnKeyIcon,
} from "../base";

/* ชุด filled (Material) ทั้ง map — ให้เมนู/หัวเพจ style เดียวกับ brand icon */
export const PAGE_ICONS = {
  calendar: CalendarTodayIcon,
  "calendar-check": EventAvailableIcon,
  "chart-line": EqualizerIcon,
  "clipboard-check": AssignmentTurnedInIcon,
  download: FileDownloadIcon,
  edit: EditIcon,
  "file-import": UploadFileIcon,
  "file-spreadsheet": TableChartIcon,
  "folder-heart": FolderSpecialIcon,
  graduation: SchoolIcon,
  "heart-handshake": VolunteerActivismIcon,
  home: HomeIcon,
  "key-round": VpnKeyIcon,
  link: LinkIcon,
  "link-plus": AddLinkIcon,
  "map-pin": PlaceIcon,
  send: SendIcon,
  settings: SettingsIcon,
  "user-check": HowToRegIcon,
  "user-circle": AccountCircleIcon,
  "user-graduate": PersonIcon,
  "user-plus": PersonAddIcon,
  "users-cog": ManageAccountsIcon,
  users: GroupIcon,
  "users-round": GroupsIcon,
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
} as const satisfies Record<string, PageIdentity>;

export function getPageIdentity(pathname: string): PageIdentity | undefined {
  return PAGE_IDENTITIES[pathname as keyof typeof PAGE_IDENTITIES];
}
