import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createReferralReportDefaults,
  referralAccessCodeSchema,
  referralReportFormSchema,
} from "./referral-report.schema";

function reportMessages(values: unknown): Record<string, string[]> {
  const result = referralReportFormSchema.safeParse(values);
  const messages: Record<string, string[]> = {};
  if (result.success) return messages;
  for (const issue of result.error.issues) {
    const field = String(issue.path[0]);
    messages[field] = [...(messages[field] ?? []), issue.message];
  }
  return messages;
}

afterEach(() => vi.useRealTimers());

describe("referralAccessCodeSchema", () => {
  it("accepts exactly six digits", () => {
    expect(
      referralAccessCodeSchema.safeParse({ accessCode: "012345" }).success,
    ).toBe(true);
  });

  it.each(["", "12345", "1234567", "12a456", "12 456", "๑๒๓๔๕๖"])(
    "rejects %j",
    (accessCode) => {
      const result = referralAccessCodeSchema.safeParse({ accessCode });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe("กรุณากรอกรหัส 6 หลัก");
    },
  );
});

describe("referralReportFormSchema", () => {
  it("starts at สำเร็จ with the current Thai date and time", () => {
    // 18:05 UTC is already the next day in Bangkok.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-11T18:05:00.000Z"));

    expect(createReferralReportDefaults()).toEqual({
      resultCode: "SUCCEEDED",
      actionDate: "2026-10-12",
      actionTime: "01:05",
      note: "",
    });
  });

  it("names each field the untouched form is missing", () => {
    expect(
      reportMessages({
        ...createReferralReportDefaults(),
        resultCode: "",
        actionDate: "",
        actionTime: "",
      }),
    ).toEqual({
      resultCode: ["กรุณาเลือกผลการดำเนินการ"],
      actionDate: ["กรุณาเลือกวันที่ดำเนินการ"],
      actionTime: ["กรุณาเลือกเวลาที่ดำเนินการ"],
      note: ["กรุณาสรุปการดำเนินการและผล"],
    });
  });

  it("refuses an action date after today in Thailand", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-11T03:00:00.000Z"));
    const report = {
      resultCode: "SUCCEEDED",
      actionTime: "09:00",
      note: "ดำเนินการแล้ว",
    };

    expect(reportMessages({ ...report, actionDate: "2026-10-12" })).toEqual({
      actionDate: ["วันที่ดำเนินการต้องไม่เกินวันนี้"],
      actionTime: ["วันและเวลาที่ดำเนินการต้องไม่อยู่ในอนาคต"],
    });
    // 03:00 UTC is 10:00 in Bangkok: later today is still in the future.
    expect(
      reportMessages({
        ...report,
        actionDate: "2026-10-11",
        actionTime: "11:00",
      }),
    ).toEqual({ actionTime: ["วันและเวลาที่ดำเนินการต้องไม่อยู่ในอนาคต"] });
    expect(reportMessages({ ...report, actionDate: "2026-10-11" })).toEqual({});
    expect(reportMessages({ ...report, actionDate: "2026-09-30" })).toEqual({});
  });

  it.each(["not-a-date", "2026-02-30", "2026-13-01"])(
    "rejects invalid calendar date %s",
    (actionDate) => {
      expect(
        referralReportFormSchema.safeParse({
          resultCode: "SUCCEEDED",
          actionDate,
          actionTime: "09:00",
          note: "สรุป",
        }).success,
      ).toBe(false);
    },
  );

  it("trims the summary and limits it to 2,000 characters", () => {
    const report = {
      resultCode: "NOT_SUCCEEDED",
      actionDate: "2026-01-05",
      actionTime: "09:00",
    };

    expect(
      referralReportFormSchema.safeParse({ ...report, note: "  สรุป  " }).data
        ?.note,
    ).toBe("สรุป");
    expect(reportMessages({ ...report, note: "   " })).toEqual({
      note: ["กรุณาสรุปการดำเนินการและผล"],
    });
    expect(reportMessages({ ...report, note: "ก".repeat(2001) })).toEqual({
      note: ["สรุปต้องไม่เกิน 2,000 ตัวอักษร"],
    });
  });
});
