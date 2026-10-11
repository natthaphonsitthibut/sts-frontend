import { matchRoutes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { router } from "../../../app/router";
import type { NotificationItem } from "../types/notifications.types";
import { getNotificationRoute } from "./notification-navigation";

const STUDENT_UUID = "9aca349f-37f6-4ee5-a3d8-e1212bbfbf17";

function notification(
  overrides: Partial<NotificationItem> = {},
): NotificationItem {
  return {
    id: "n1",
    type_code: "STUDENT_WATCHLIST_ALERT",
    title: "นักเรียนเข้ากลุ่มเฝ้าระวัง",
    student_person_uuid: "p1",
    case_id: null,
    case_status_code: null,
    student_name_snapshot: "นักเรียน ทดสอบ",
    reason_text: null,
    ref_entity: "classroom_student_comments",
    ref_id: "91",
    student_uuid: STUDENT_UUID,
    created_at: "2026-09-28T03:00:00.000Z",
    ...overrides,
  };
}

function caseNotification(
  overrides: Partial<NotificationItem> = {},
): NotificationItem {
  return notification({
    type_code: "CASE_STATUS_CHANGED",
    ref_entity: "case",
    ref_id: "42",
    case_id: 42,
    ...overrides,
  });
}

function holding(...permissions: string[]) {
  return (permissionId: string) => permissions.includes(permissionId);
}

describe("getNotificationRoute", () => {
  it("opens a case only for an account that can open cases", () => {
    expect(getNotificationRoute(caseNotification(), holding("dashboard"))).toBe(
      "/cases/42",
    );
    expect(
      getNotificationRoute(caseNotification(), holding("students")),
    ).toBeNull();
    expect(
      getNotificationRoute(
        caseNotification({ ref_id: null }),
        holding("dashboard"),
      ),
    ).toBeNull();
  });

  // Regression: every destination used to hang on `dashboard` alone, so a
  // teacher holding only `students` could not open a watchlist alert at all.
  it.each(["students", "manage-students", "classrooms"])(
    "opens the student profile for an account holding %s",
    (permission) => {
      expect(getNotificationRoute(notification(), holding(permission))).toBe(
        `/students/${STUDENT_UUID}`,
      );
    },
  );

  // Regression: `dashboard` alone was sent to /students/:id, which that
  // account cannot enter, and landed on /forbidden.
  it("falls back to the watchlist report when the profile is not accessible", () => {
    expect(getNotificationRoute(notification(), holding("dashboard"))).toBe(
      "/student-risk-report/watchlist",
    );
  });

  it("falls back to an accessible report when the student is out of scope", () => {
    const outOfScope = notification({ student_uuid: null });
    expect(
      getNotificationRoute(outOfScope, holding("dashboard", "students")),
    ).toBe("/student-risk-report/watchlist");
    expect(getNotificationRoute(outOfScope, holding("students"))).toBe(
      "/student-risk-report/teacher-comments",
    );
    expect(getNotificationRoute(outOfScope, holding("classrooms"))).toBeNull();
  });

  it("links nowhere for an account with no matching page", () => {
    expect(getNotificationRoute(notification(), holding("home"))).toBeNull();
    expect(
      getNotificationRoute(
        notification({ ref_entity: "something_else" }),
        () => true,
      ),
    ).toBeNull();
  });

  it("only ever returns a route the router knows", () => {
    for (const route of [
      getNotificationRoute(caseNotification(), () => true),
      getNotificationRoute(notification(), () => true),
      getNotificationRoute(notification(), holding("dashboard")),
      getNotificationRoute(
        notification({ student_uuid: null }),
        holding("students"),
      ),
    ]) {
      const matches = matchRoutes(router.routes, route ?? "");
      expect(matches?.at(-1)?.route.path).not.toBe("*");
    }
  });
});
