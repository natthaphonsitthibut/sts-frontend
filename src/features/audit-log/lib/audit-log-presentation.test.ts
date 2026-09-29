import { describe, expect, it } from "vitest";
import {
  formatAuditLogDetails,
  formatAuditLogDetailValue,
} from "./audit-log-presentation";

describe("audit log detail presentation", () => {
  it("translates known audit codes in both list and detail without changing free text", () => {
    const details = [
      { label: "ประเภท", value: "VISIT" },
      { label: "ผลการตรวจสอบ", value: "REFER_AGENCY" },
      { label: "วิธียืนยันตัวตน", value: "THAID" },
    ];

    expect(formatAuditLogDetails(details)).toBe(
      "ประเภท: ลงพื้นที่ · ผลการตรวจสอบ: ส่งต่อหน่วยงาน · วิธียืนยันตัวตน: AraID",
    );
    expect(formatAuditLogDetailValue("VISIT", "หมายเหตุ")).toBe("VISIT");
  });

  it("uses the shared Thai date format for timestamps and calendar dates", () => {
    expect(formatAuditLogDetailValue("2026-09-30T01:00:00.000Z")).not.toContain(
      "T01:00",
    );
    expect(formatAuditLogDetailValue("2026-09-30", "วันที่")).not.toBe(
      "2026-09-30",
    );
  });
});
