import { describe, expect, it } from "vitest";
import {
  buildMenuSections,
  filterMenuItems,
  getMenuRealms,
  isAggregateOnlyExecutive,
  MENU_ITEMS,
  type DataScope,
} from "./permissions";
import { collectMenuRoutes } from "../../../components/layout/menu-routes";

const ALL_PAGES = [
  "home",
  "dashboard",
  "students",
  "teachers",
  "classrooms",
  "nl_query:use",
  "manage-students",
  "manage-teachers",
  "manage-school-structure",
  "manage-subjects",
  "import-data",
  "export-data",
  "master-data",
  "attendance",
  "manage-classroom-links",
  "manage-users-list",
  "manage-role-groups",
  "settings",
  "manage-schools",
  "audit-log",
];
const SCHOOL_SCOPE = { school_ids: [10010002] };

/** What the sidebar lists for one account: [section header, entry labels]. */
function sidebarOf(
  permissions: string[],
  roles: string[],
  dataScope: DataScope,
): Array<[string | null, string[]]> {
  const filtered = filterMenuItems(MENU_ITEMS, permissions, dataScope, roles);
  return buildMenuSections(filtered, roles, dataScope).map((section) => [
    section.label,
    section.items.map((entry) =>
      entry.children
        ? `${entry.label}: ${entry.children.map((c) => c.label).join(", ")}`
        : entry.label,
    ),
  ]);
}

// The owner's four mockups (2026-09-25), with their later changes: master data
// is the council's, แชตบอท is ผู้บริหาร's alone, ผู้ดูแลระบบสภา holds everything.
describe("default menu groups match the sidebar mockups", () => {
  it("ผู้ดูแลระบบโรงเรียน", () => {
    const permissions = [
      "home",
      "dashboard",
      "classrooms",
      "manage-users-list",
      "manage-role-groups",
      "manage-school-structure",
      "manage-subjects",
      "manage-teachers",
      "manage-classroom-links",
      "manage-students",
      "import-data",
      "export-data",
      "audit-log",
    ];
    expect(
      sidebarOf(permissions, ["S10010002_BASE_ADMIN"], SCHOOL_SCOPE),
    ).toEqual([
      [
        null,
        [
          "หน้าหลัก",
          "รายงานสถานะนักเรียน",
          "ห้องเรียนทั้งหมด",
          "จัดการสิทธิ์ผู้ใช้งาน: จัดการผู้ใช้งาน, จัดการกลุ่มเมนู",
          "จัดการข้อมูล: จัดการภาคเรียนและห้องเรียน, จัดการข้อมูลหลักสูตร, จัดการข้อมูลคุณครู, จัดการลิงก์คุณครู, จัดการข้อมูลนักเรียน",
          "นำเข้าและส่งออกข้อมูล: นำเข้าข้อมูล, ส่งออกข้อมูล",
        ],
      ],
    ]);
  });

  it("ผู้อำนวยการโรงเรียน", () => {
    const permissions = [
      "home",
      "dashboard",
      "classrooms",
      "teachers",
      "students",
      "export-data",
      "audit-log",
    ];
    expect(
      sidebarOf(permissions, ["S10010002_BASE_DIRECTOR"], SCHOOL_SCOPE),
    ).toEqual([
      [
        null,
        [
          "หน้าหลัก",
          "รายงานสถานะนักเรียน",
          "ห้องเรียนทั้งหมด",
          "รายชื่อคุณครู",
          "รายชื่อนักเรียน",
          "ส่งออกข้อมูล",
        ],
      ],
    ]);
  });

  it("ผู้บริหารสภา — its lone export entry stands on its own with the download icon", () => {
    const permissions = ["home", "dashboard", "export-data", "nl_query:use"];
    expect(sidebarOf(permissions, ["EXECUTIVE"], { global: true })).toEqual([
      [null, ["หน้าหลัก", "รายงานสถานะนักเรียน", "ส่งออกข้อมูล", "แชตบอท"]],
    ]);
    const filtered = filterMenuItems(
      MENU_ITEMS,
      permissions,
      { global: true },
      ["EXECUTIVE"],
    );
    const exportEntry = buildMenuSections(filtered, ["EXECUTIVE"], {
      global: true,
    })[0].items.find((entry) => entry.route === "/data-exports");
    expect(exportEntry?.iconName).toBe("download");
  });

  it("ผู้ดูแลระบบสภา sees both sections, headed", () => {
    const sections = sidebarOf(ALL_PAGES, ["ADMIN"], { global: true });
    expect(sections.map(([label]) => label)).toEqual([
      "เมนูส่วนโรงเรียน",
      "เมนูส่วนสภา",
    ]);
    expect(sections[1][1]).toEqual([
      "จัดการข้อมูลโรงเรียน",
      "จัดการสิทธิ์ผู้ใช้งาน: จัดการผู้ใช้งาน, จัดการกลุ่มเมนู",
      "จัดการข้อมูลพื้นฐาน",
      "แชตบอท",
      "ตั้งค่าระบบ",
    ]);
  });

  it("never shows the school's user-management copy to a council-only account", () => {
    const sections = sidebarOf(
      ["home", "manage-users-list"],
      ["COUNCIL_CUSTOM"],
      {
        provinces: ["เชียงใหม่"],
      },
    );
    expect(sections).toEqual([[null, ["หน้าหลัก", "จัดการผู้ใช้งาน"]]]);
    const filtered = filterMenuItems(MENU_ITEMS, ["manage-users-list"], {}, [
      "COUNCIL_CUSTOM",
    ]);
    const [entry] = buildMenuSections(filtered, ["COUNCIL_CUSTOM"], {})[0]
      .items;
    expect(entry.route).toBe("/council/manage-users");
  });
});

describe("getMenuRealms", () => {
  it("reads the realm from scope, not the group name", () => {
    expect(getMenuRealms(["S1_BASE_ADMIN"], SCHOOL_SCOPE)).toEqual(["school"]);
    expect(getMenuRealms(["ADMIN"], SCHOOL_SCOPE)).toEqual(["school"]);
    expect(getMenuRealms(["ADMIN"], { global: true })).toEqual([
      "school",
      "council",
    ]);
    expect(getMenuRealms(["EXECUTIVE"], { global: true })).toEqual(["council"]);
  });
});

describe("MENU_ITEMS — school/council manage-users split", () => {
  // ADMIN sees both sections, so this exercises the worst case for the
  // dual-active regression this guards against.
  const sections = buildMenuSections(MENU_ITEMS, ["ADMIN"], { global: true });
  const school = sections.find((section) => section.key === "school")!.items;
  const council = sections.find((section) => section.key === "council")!.items;

  it("gives the school and council manage-users groups disjoint routes", () => {
    // Regression guard: these two groups used to be one "both"-tagged group
    // pointing at the same routes, which made the same link light up active
    // in both sections at once (owner, 2026-09-22 — "แยกกันด้วยอย่าให้ active
    // พร้อมกัน"). Every route under one group must be absent from the other.
    const schoolRoutes = collectMenuRoutes(school);
    const councilRoutes = collectMenuRoutes(council);
    for (const route of schoolRoutes) {
      expect(councilRoutes).not.toContain(route);
    }
  });

  it("keeps students/teachers management school-only", () => {
    const councilRoutes = collectMenuRoutes(council);
    expect(councilRoutes).not.toContain("/manage-students");
    expect(councilRoutes).not.toContain("/manage-teachers");
  });

  it("gives the council manage-users group exactly two children (ผู้ใช้งาน + กลุ่มเมนู)", () => {
    const councilManageUsers = council.find(
      (item) => item.id === "manage-users-council",
    );
    expect(councilManageUsers?.children?.map((c) => c.route)).toEqual([
      "/council/manage-users",
      "/council/manage-role-groups",
    ]);
  });

  it("puts home first under เมนูส่วนโรงเรียน, never under เมนูส่วนสภา", () => {
    expect(school[0]?.id).toBe("home");
    expect(council.some((item) => item.id === "home")).toBe(false);
  });
});

describe("council จัดการกลุ่มเมนู", () => {
  const councilRoutes = (dataScope: DataScope) =>
    collectMenuRoutes(
      filterMenuItems(MENU_ITEMS, ALL_PAGES, dataScope, ["ADMIN"]),
    );

  it("is shown to every council admin, national or of an area", () => {
    expect(councilRoutes({ global: true })).toContain(
      "/council/manage-role-groups",
    );
    // An area admin manages its own area's groups, like a school admin.
    const area = collectMenuRoutes(
      filterMenuItems(
        MENU_ITEMS,
        ALL_PAGES,
        {
          provinces: ["เชียงใหม่"],
          districts: ["เมืองเชียงใหม่"],
          sub_districts: ["สุเทพ"],
        },
        ["A500108_BASE_ADMIN"],
      ),
    );
    expect(area).toContain("/council/manage-users");
    expect(area).toContain("/council/manage-role-groups");
  });
});

describe("isAggregateOnlyExecutive", () => {
  it("treats an area's own ผู้บริหาร like the national one", () => {
    expect(isAggregateOnlyExecutive(["EXECUTIVE"])).toBe(true);
    expect(isAggregateOnlyExecutive(["A500108_BASE_EXECUTIVE"])).toBe(true);
    expect(isAggregateOnlyExecutive(["A500108_BASE_ADMIN"])).toBe(false);
    expect(isAggregateOnlyExecutive(["S10010004_BASE_DIRECTOR"])).toBe(false);
  });
});
