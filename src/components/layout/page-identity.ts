import { Bot, type LucideIcon } from "lucide-react";
import {
  AccountCircleIcon,
  AddLinkIcon,
  ApartmentIcon,
  AppsIcon,
  AssignmentTurnedInIcon,
  BarChartIcon,
  CalendarTodayIcon,
  ChatBubbleIcon,
  ChildCareIcon,
  EditIcon,
  EqualizerIcon,
  EventAvailableIcon,
  FactCheckIcon,
  FileDownloadIcon,
  FolderSpecialIcon,
  GroupIcon,
  GroupsIcon,
  HomeIcon,
  HowToRegIcon,
  ImportExportIcon,
  LinkIcon,
  ManageAccountsIcon,
  PersonAddIcon,
  PersonIcon,
  PlaceIcon,
  SchoolBuildingIcon,
  SchoolIcon,
  SecurityIcon,
  SendIcon,
  SettingsIcon,
  TableChartIcon,
  UploadFileIcon,
  VolunteerActivismIcon,
  VpnKeyIcon,
} from "../base";

/* ชุด filled (Material) ทั้ง map — ให้เมนู/หัวเพจ style เดียวกับ brand icon */
export const PAGE_ICONS = {
  apartment: ApartmentIcon,
  apps: AppsIcon,
  "bar-chart": BarChartIcon,
  bot: Bot,
  chat: ChatBubbleIcon,
  child: ChildCareIcon,
  calendar: CalendarTodayIcon,
  "calendar-check": EventAvailableIcon,
  "chart-line": EqualizerIcon,
  "clipboard-check": AssignmentTurnedInIcon,
  download: FileDownloadIcon,
  "fact-check": FactCheckIcon,
  edit: EditIcon,
  "file-import": UploadFileIcon,
  "file-spreadsheet": TableChartIcon,
  "folder-heart": FolderSpecialIcon,
  graduation: SchoolIcon,
  "heart-handshake": VolunteerActivismIcon,
  home: HomeIcon,
  "import-export": ImportExportIcon,
  "key-round": VpnKeyIcon,
  link: LinkIcon,
  "link-plus": AddLinkIcon,
  "map-pin": PlaceIcon,
  "school-building": SchoolBuildingIcon,
  security: SecurityIcon,
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

const createIdentity = (
  title: string,
  iconName: PageIconName,
): PageIdentity => ({
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
  "/attendance": createIdentity("เช็กชื่อ", "edit"),
  "/attendance/classroom-links": createIdentity("จัดการลิงก์คุณครู", "link"),
  "/classrooms": createIdentity("ห้องเรียนทั้งหมด", "apartment"),
  "/curriculum": createIdentity("จัดการข้อมูลหลักสูตร", "file-spreadsheet"),
  "/subjects": createIdentity("จัดการข้อมูลหลักสูตร", "file-spreadsheet"),
  "/data-exports": createIdentity("ส่งออกข้อมูล", "download"),
  "/data-exports/history": createIdentity("ส่งออกข้อมูล", "download"),
  "/import-data": createIdentity("นำเข้าข้อมูล", "file-import"),
  "/import-data/history": createIdentity("นำเข้าข้อมูล", "file-import"),
  "/manage-role-groups": createIdentity("จัดการกลุ่มเมนู", "users-cog"),
  "/manage-schools": createIdentity("จัดการข้อมูลโรงเรียน", "home"),
  "/council/manage-users": createIdentity("จัดการผู้ใช้งาน", "users"),
  "/council/manage-role-groups": createIdentity("จัดการกลุ่มเมนู", "users-cog"),
  "/teachers": createIdentity("รายชื่อคุณครู", "users-round"),
  "/manage-students": createIdentity("จัดการข้อมูลนักเรียน", "users-round"),
  "/manage-students/export": createIdentity(
    "จัดการข้อมูลนักเรียน",
    "users-round",
  ),
  "/manage-students/history": createIdentity(
    "จัดการข้อมูลนักเรียน",
    "users-round",
  ),
  "/manage-teachers": createIdentity("จัดการข้อมูลคุณครู", "users-round"),
  "/manage-users": createIdentity("จัดการผู้ใช้งาน", "users"),
  "/master-data": createIdentity("จัดการข้อมูลพื้นฐาน", "file-spreadsheet"),
  "/master-data/student-statuses": createIdentity(
    "สถานะนักเรียน",
    "file-spreadsheet",
  ),
  "/nl-query": createIdentity("แชตบอท", "chat"),
  "/school-structure": createIdentity(
    "จัดการภาคเรียนและห้องเรียน",
    "graduation",
  ),
  "/settings": createIdentity("ตั้งค่าระบบ", "settings"),
  "/student-risk-report": createIdentity("รายงานสถานะนักเรียน", "bar-chart"),
  "/student-risk-report/risk": createIdentity(
    "รายงานสถานะนักเรียน",
    "chart-line",
  ),
  "/student-risk-report/watchlist": createIdentity(
    "รายงานสถานะนักเรียน",
    "chart-line",
  ),
  "/student-risk-report/referrals": createIdentity(
    "รายงานสถานะนักเรียน",
    "chart-line",
  ),
  "/student-risk-report/teacher-comments": createIdentity(
    "ความคิดเห็นจากคุณครู",
    "clipboard-check",
  ),
  "/students": createIdentity("รายชื่อนักเรียน", "child"),
} as const satisfies Record<string, PageIdentity>;

export function getPageIdentity(pathname: string): PageIdentity | undefined {
  return PAGE_IDENTITIES[pathname as keyof typeof PAGE_IDENTITIES];
}

/** Keep repeated page names on the same canonical icon even on non-menu routes. */
export function getPageIdentityByTitle(
  title: string,
): PageIdentity | undefined {
  return Object.values(PAGE_IDENTITIES).find(
    (identity) => identity.title === title,
  );
}
