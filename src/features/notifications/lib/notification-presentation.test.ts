import { Eye, TriangleAlert } from "lucide-react";
import { describe, expect, it } from "vitest";
import type { NotificationItem } from "../types/notifications.types";
import { formatNotificationBody } from "./notification-body";
import { getNotificationRoute } from "./notification-navigation";
import { getNotificationIconPresentation } from "./notification-presentation";

function watchlistAlert(
  overrides: Partial<NotificationItem> = {},
): NotificationItem {
  return {
    id: "n1",
    type_code: "STUDENT_WATCHLIST_ALERT",
    title: "นักเรียนเข้ากลุ่มเฝ้าระวัง: น่ากังวล",
    student_person_uuid: "p1",
    case_id: null,
    case_status_code: null,
    student_name_snapshot: "ณิชาภา เพชรสว่าง",
    reason_text: "หัวข้อปัญหา: ปัญหาด้านการเรียน",
    ref_entity: "classroom_student_comments",
    ref_id: "91",
    student_uuid: "9aca349f-37f6-4ee5-a3d8-e1212bbfbf17",
    concern_level_code: "CONCERN",
    created_at: "2026-09-28T03:00:00.000Z",
    ...overrides,
  };
}

describe("watchlist alert notifications", () => {
  it("wears the comment level like the กลุ่มเฝ้าระวัง tab", () => {
    expect(getNotificationIconPresentation(watchlistAlert()).icon).toBe(
      TriangleAlert,
    );
    expect(
      getNotificationIconPresentation(
        watchlistAlert({ concern_level_code: "WATCH" }),
      ).icon,
    ).toBe(Eye);
  });

  it("opens the student profile", () => {
    expect(getNotificationRoute(watchlistAlert())).toBe(
      "/students/9aca349f-37f6-4ee5-a3d8-e1212bbfbf17",
    );
    expect(
      getNotificationRoute(watchlistAlert({ student_uuid: null })),
    ).toBeNull();
  });

  it("reads as the student name then the reason", () => {
    expect(formatNotificationBody(watchlistAlert())).toBe(
      "ณิชาภา เพชรสว่าง · หัวข้อปัญหา: ปัญหาด้านการเรียน",
    );
  });
});
