import { matchRoutes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { router } from "../app/router";
import {
  isPublicClassroomLinkPath,
  isPublicLinkPath,
} from "./public-link-routes";

describe("isPublicLinkPath", () => {
  it.each([
    "/task/abc123",
    "/task/abc123/report",
    "/task/google-callback",
    // Regression: the agency's referral link was missing from the list, so a
    // stale link session there signed the staff account out.
    "/referral-report/abc123",
    "/classroom",
    "/classroom/students/9",
    "/classroom/links/4",
    "/check-in",
    "/araid",
    "/araid/authorize",
    "/apply/abc123",
    "/line-link",
    "/line-link/araid",
  ])("treats %s as a public link page", (pathname) => {
    expect(isPublicLinkPath(pathname)).toBe(true);
  });

  it.each([
    "/",
    "/students",
    "/students/9aca349f",
    "/cases/42",
    "/notifications",
    "/student-risk-report/watchlist",
    // Staff pages that merely start with a public prefix must stay staff pages.
    "/tasks/12",
    "/task-detail/12",
    "/classrooms",
    "/classrooms/3/roster",
    "/check-in/extra",
    "/login",
  ])("treats %s as a staff page", (pathname) => {
    expect(isPublicLinkPath(pathname)).toBe(false);
  });

  it("covers every route the router serves outside the staff layout", () => {
    // Paths that are public but call no link-scoped API of their own.
    const noLinkSession = new Set([
      "/about",
      "/privacy",
      "/login",
      "/forbidden",
    ]);
    const publicRoutes = (router.routes[0].children ?? []).filter(
      (route) => route.path && route.path !== "/" && route.path !== "*",
    );
    expect(publicRoutes.length).toBeGreaterThan(0);

    for (const route of publicRoutes) {
      const pathname = route
        .path!.replace(/\/\*$/, "")
        .replace(/:[A-Za-z]+/g, "sample");
      if (noLinkSession.has(pathname) || pathname === "/admin-access") continue;
      expect(matchRoutes(router.routes, pathname)).not.toBeNull();
      expect(isPublicLinkPath(pathname), pathname).toBe(true);
    }
  });
});

describe("isPublicClassroomLinkPath", () => {
  it("is the classroom link surface only", () => {
    expect(isPublicClassroomLinkPath("/classroom")).toBe(true);
    expect(isPublicClassroomLinkPath("/classroom/students/9")).toBe(true);
    expect(isPublicClassroomLinkPath("/check-in")).toBe(true);
    expect(isPublicClassroomLinkPath("/classrooms")).toBe(false);
    expect(isPublicClassroomLinkPath("/referral-report/abc")).toBe(false);
    expect(isPublicClassroomLinkPath("/task/abc")).toBe(false);
  });
});
