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
  SchoolBuildingIcon,
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
  "school-building": SchoolBuildingIcon,
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
 * Canonical identity for sidebar destinations and their tab/history routes.
 * Detail, create and edit routes stay outside this map so they can retain a
 * task-specific title and icon.
 */
export const PAGE_IDENTITIES = {
  "/": createIdentity("หน้าหลัก", "home"),
  "/attendance": createIdentity("เช็คชื่อ", "edit"),
  "/attendance/history": createIdentity("เช็คชื่อ", "edit"),
  "/attendance-links": createIdentity("ลิงก์เช็คชื่อ", "clipboard-check"),
  "/attendance-links/history": createIdentity("ลิงก์เช็คชื่อ", "clipboard-check"),
  "/attendance-operations": createIdentity("ความครบถ้วน", "calendar-check"),
  "/cases": createIdentity("เคสติดตาม", "clipboard-check"),
  "/cases/history": createIdentity("เคสติดตาม", "clipboard-check"),
  "/classrooms": createIdentity("ห้องเรียนทั้งหมด", "school-building"),
  "/create": createIdentity("สร้างลิงก์", "link-plus"),
  "/data-exports": createIdentity("ส่งออกข้อมูล", "download"),
  "/data-exports/history": createIdentity("ส่งออกข้อมูล", "download"),
  "/field-follower-applications": createIdentity("ตรวจสอบใบสมัคร", "user-check"),
  "/field-follower-applications/history": createIdentity("ตรวจสอบใบสมัคร", "user-check"),
  "/field-followers": createIdentity("ลิงก์รับสมัคร", "send"),
  "/field-followers/history": createIdentity("ลิงก์รับสมัคร", "send"),
  "/field-monitor-map": createIdentity("แผนที่เด็กเสี่ยง", "map-pin"),
  "/import-data": createIdentity("นำเข้าข้อมูล", "file-import"),
  "/import-data/history": createIdentity("นำเข้าข้อมูล", "file-import"),
  "/login-links": createIdentity("ลิงก์เข้าใช้งาน", "link"),
  "/login-links/history": createIdentity("ลิงก์เข้าใช้งาน", "link"),
  "/login-links/teacher": createIdentity("ลิงก์เข้าใช้งาน", "link"),
  "/manage-role-groups": createIdentity("จัดการกลุ่มผู้ใช้งาน", "users-cog"),
  "/manage-student-accounts": createIdentity("บัญชีนักเรียน", "user-plus"),
  "/manage-student-accounts/batch": createIdentity("บัญชีนักเรียน", "user-plus"),
  "/manage-student-accounts/generate": createIdentity("บัญชีนักเรียน", "user-plus"),
  "/manage-student-accounts/history": createIdentity("บัญชีนักเรียน", "user-plus"),
  "/manage-users": createIdentity("จัดการรายชื่อผู้ใช้งาน", "users"),
  "/manage-users/history": createIdentity("จัดการรายชื่อผู้ใช้งาน", "users"),
  "/my-attendance": createIdentity("ข้อมูลตัวเอง", "user-circle"),
  "/school-structure": createIdentity("โครงสร้างโรงเรียน", "graduation"),
  "/settings": createIdentity("ตั้งค่าระบบ", "settings"),
  "/student-risk-report": createIdentity("ความเสี่ยงจากการมาเรียน", "chart-line"),
  "/student-risk-report/teacher-reports": createIdentity("ข้อสังเกตจากครู", "clipboard-check"),
  "/student-risk-report/home-visit-requests": createIdentity("คำขอเยี่ยมบ้าน", "folder-heart"),
  "/students": createIdentity("รายชื่อนักเรียน", "user-graduate"),
  "/students/history": createIdentity("รายชื่อนักเรียน", "user-graduate"),
  "/teacher-access-grants": createIdentity("ลิงก์เข้าใช้งานครู", "key-round"),
  "/timetable": createIdentity("ตารางสอน", "calendar"),
  "/visit-links": createIdentity("ลิงก์ลงพื้นที่", "map-pin"),
  "/visit-links/history": createIdentity("ลิงก์ลงพื้นที่", "map-pin"),
} as const satisfies Record<string, PageIdentity>;

export function getPageIdentity(pathname: string): PageIdentity | undefined {
  return PAGE_IDENTITIES[pathname as keyof typeof PAGE_IDENTITIES];
}

/** Keep repeated page names on the same canonical icon even on non-menu routes. */
export function getPageIdentityByTitle(title: string): PageIdentity | undefined {
  return Object.values(PAGE_IDENTITIES).find(
    (identity) => identity.title === title,
  );
}
