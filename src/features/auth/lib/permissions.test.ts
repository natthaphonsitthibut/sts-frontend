import { describe, expect, it } from "vitest";
import {
  groupMenuItemsBySection,
  MENU_ITEMS,
  type MenuItem,
} from "./permissions";
import { collectMenuRoutes } from "../../../components/layout/menu-routes";

function item(id: string, section?: MenuItem["section"]): MenuItem {
  return { id, label: id, section };
}

describe("groupMenuItemsBySection", () => {
  it("treats home as a plain school-section item (owner, 2026-09-22)", () => {
    const { school, council } = groupMenuItemsBySection(
      [item("home", "school"), item("students", "school")],
      ["ADMIN"],
    );
    expect(school.map((i) => i.id)).toEqual(["home", "students"]);
    expect(council.map((i) => i.id)).toEqual([]);
  });

  it("puts a school-tagged item only under school, for a role that can see the school section", () => {
    const { school, council } = groupMenuItemsBySection(
      [item("students", "school")],
      ["DIRECTOR"],
    );
    expect(school.map((i) => i.id)).toEqual(["students"]);
    expect(council).toEqual([]);
  });

  it("puts a council-tagged item only under council, for a role that can see the council section", () => {
    const { school, council } = groupMenuItemsBySection(
      [item("settings", "council")],
      ["EXECUTIVE"],
    );
    expect(council.map((i) => i.id)).toEqual(["settings"]);
    expect(school).toEqual([]);
  });

  it("returns empty buckets for an untagged item even for ADMIN (e.g. a custom rail with no section metadata)", () => {
    const { school, council } = groupMenuItemsBySection(
      [item("teacher-link")],
      ["ADMIN"],
    );
    expect(school).toEqual([]);
    expect(council).toEqual([]);
  });

  // Owner's spec (2026-09-22): "สภา (ผู้ดูแลระบบ, ผู้บริหาร) โรงเรียน
  // (ผู้ดูแลระบบ, ผอ.) default ไว้เท่านี้" — a role gate on top of whatever
  // permissions an account happens to hold.
  it("hides the council section entirely for a DIRECTOR, even for a council-tagged item they'd otherwise have permission to reach", () => {
    const { school, council } = groupMenuItemsBySection(
      [item("dashboard", "school"), item("settings", "council")],
      ["DIRECTOR"],
    );
    expect(school.map((i) => i.id)).toEqual(["dashboard"]);
    expect(council).toEqual([]);
  });

  it("hides the school section entirely for an EXECUTIVE", () => {
    const { school, council } = groupMenuItemsBySection(
      [item("dashboard", "school"), item("settings", "council")],
      ["EXECUTIVE"],
    );
    expect(school).toEqual([]);
    expect(council.map((i) => i.id)).toEqual(["settings"]);
  });

  it("shows neither section for a role with no section access (e.g. TEACHER, STUDENT)", () => {
    const { school, council } = groupMenuItemsBySection(
      [item("dashboard", "school"), item("settings", "council")],
      ["TEACHER"],
    );
    expect(school).toEqual([]);
    expect(council).toEqual([]);
  });
});

describe("MENU_ITEMS — school/council manage-users split", () => {
  // ADMIN sees both sections, so this exercises the worst case for the
  // dual-active regression this guards against.
  const { school, council } = groupMenuItemsBySection(MENU_ITEMS, ["ADMIN"]);

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
