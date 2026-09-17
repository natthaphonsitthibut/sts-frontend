import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SidebarNavItem } from "./SidebarNavItem";
import type { MenuItem } from "../../features/auth/lib/permissions";

const CHILDREN: MenuItem[] = [
  { id: "a", label: "ม.1/1 · คณิตศาสตร์", route: "/classroom/check-in/1/2" },
];

/** A group the app builds from permissions: toggles, never navigates. */
const APP_GROUP: MenuItem = {
  id: "attendance-system",
  label: "ระบบเช็กชื่อ",
  iconName: "calendar-check",
  children: CHILDREN,
};

/** The classroom link's group: the same row, but it also opens a page. */
const LINK_GROUP: MenuItem = {
  id: "my-classrooms",
  label: "ห้องเรียนของฉัน",
  iconName: "school-building",
  route: "/classroom",
  activeRoutes: ["/classroom"],
  children: CHILDREN,
};

function renderItem(item: MenuItem, collapsed: boolean) {
  const { container } = render(
    <MemoryRouter initialEntries={["/somewhere-else"]}>
      <SidebarNavItem collapsed={collapsed} item={item} menuRoutes={[]} />
    </MemoryRouter>,
  );
  return container;
}

// `className` on an SVG is an SVGAnimatedString, so read the attribute.
function classesOf(container: HTMLElement, selector: string): string {
  const el = container.querySelector(selector);
  expect(el).not.toBeNull();
  return el!.getAttribute("class") ?? "";
}

/**
 * The link's rail wobbled while the app's own groups glided, because the row
 * had been rebuilt here instead of reused: a second box around the chevron meant
 * two nested elements animating their own size through the same 300ms squeeze.
 * These assertions pin the shapes together so the two cannot drift again.
 */
describe("collapsible sidebar groups animate identically", () => {
  it.each([false, true])(
    "gives both group kinds the same chevron (collapsed: %s)",
    (collapsed) => {
      const app = renderItem(APP_GROUP, collapsed);
      const link = renderItem(LINK_GROUP, collapsed);

      expect(classesOf(link, "svg.absolute")).toBe(
        classesOf(app, "svg.absolute"),
      );
    },
  );

  it.each([false, true])(
    "gives both group kinds the same row and children container (collapsed: %s)",
    (collapsed) => {
      const app = renderItem(APP_GROUP, collapsed);
      const link = renderItem(LINK_GROUP, collapsed);

      // The row: a button in the app, a link here — same class string either way.
      expect(classesOf(link, "a")).toBe(
        classesOf(app, "button[aria-expanded]"),
      );
      expect(classesOf(link, "div[aria-hidden]")).toBe(
        classesOf(app, "div[aria-hidden]"),
      );
    },
  );

  it("keeps the toggle target out of the chevron's own box", () => {
    const link = renderItem(LINK_GROUP, false);
    const toggles = link.querySelectorAll("button[aria-expanded]");

    // Exactly one toggle, and it holds nothing: a box around the chevron would
    // animate its own size beside the glyph and make the row wobble.
    expect(toggles).toHaveLength(1);
    expect(toggles[0].childElementCount).toBe(0);
    expect(toggles[0].className).not.toMatch(/transition/);

    // Navigation and folding are separate controls, so opening a page never
    // lands its first layout inside the accordion's animation.
    const row = link.querySelector("a");
    expect(row?.getAttribute("href")).toBe("/classroom");
    expect(row?.querySelector("button")).toBeNull();
  });
});
