import { describe, expect, it } from "vitest";
import {
  createReferralFormDefaults,
  referralFormSchema,
  toReferralIsoDateTime,
  type ReferralFormValues,
} from "./referral.schema";

const validReferral: ReferralFormValues = {
  startsOn: "2026-10-11",
  startsAt: "09:00",
  endsOn: "2026-10-18",
  endsAt: "16:30",
  agencyId: "3",
  note: "ต้องการความช่วยเหลือด้านสุขภาพ",
};

function messagesByField(values: ReferralFormValues): Record<string, string[]> {
  const result = referralFormSchema.safeParse(values);
  const messages: Record<string, string[]> = {};
  if (result.success) return messages;
  for (const issue of result.error.issues) {
    const field = String(issue.path[0]);
    messages[field] = [...(messages[field] ?? []), issue.message];
  }
  return messages;
}

describe("referralFormSchema", () => {
  it("accepts a complete referral and trims the reason", () => {
    const result = referralFormSchema.safeParse({
      ...validReferral,
      note: "  เหตุผล  ",
    });
    expect(result.success).toBe(true);
    expect(result.data?.note).toBe("เหตุผล");
  });

  it("names every missing field on its own", () => {
    expect(
      messagesByField({
        startsOn: "",
        startsAt: "",
        endsOn: "",
        endsAt: "",
        agencyId: "",
        note: "   ",
      }),
    ).toEqual({
      startsOn: ["กรุณาเลือกวันที่เริ่ม"],
      startsAt: ["กรุณาเลือกเวลาเริ่ม"],
      endsOn: ["กรุณาเลือกวันที่สิ้นสุด"],
      endsAt: ["กรุณาเลือกเวลาสิ้นสุด"],
      agencyId: ["กรุณาเลือกหน่วยงานที่ส่งต่อ"],
      note: ["กรุณาระบุเหตุผลการส่งต่อ"],
    });
  });

  it("puts a window that ends before it starts on both end fields", () => {
    const message = "วันและเวลาสิ้นสุดต้องอยู่หลังวันและเวลาเริ่ม";
    expect(
      messagesByField({
        ...validReferral,
        endsOn: "2026-10-11",
        endsAt: "09:00",
      }),
    ).toEqual({ endsOn: [message], endsAt: [message] });
    expect(messagesByField({ ...validReferral, endsOn: "2026-10-10" })).toEqual(
      { endsOn: [message], endsAt: [message] },
    );
    expect(
      messagesByField({
        ...validReferral,
        endsOn: "2026-10-11",
        endsAt: "09:01",
      }),
    ).toEqual({});
  });

  it.each([
    { startsOn: "not-a-date" },
    { startsOn: "2026-02-30" },
    { endsOn: "2026-13-01" },
    { startsAt: "25:00" },
    { endsAt: "12:99" },
  ])("rejects malformed dates and times without throwing (%j)", (invalid) => {
    expect(() =>
      referralFormSchema.safeParse({ ...validReferral, ...invalid }),
    ).not.toThrow();
    expect(
      referralFormSchema.safeParse({ ...validReferral, ...invalid }).success,
    ).toBe(false);
  });

  it("limits the reason to 2,000 characters", () => {
    expect(
      messagesByField({ ...validReferral, note: "ก".repeat(2001) }).note,
    ).toEqual(["เหตุผลการส่งต่อต้องไม่เกิน 2,000 ตัวอักษร"]);
    expect(
      messagesByField({ ...validReferral, note: "ก".repeat(2000) }),
    ).toEqual({});
  });
});

describe("referral window helpers", () => {
  it("reads the picked date and time as Thailand time", () => {
    expect(toReferralIsoDateTime("2026-10-11", "09:00")).toBe(
      "2026-10-11T02:00:00.000Z",
    );
    expect(toReferralIsoDateTime("2026-10-11", "00:30")).toBe(
      "2026-10-10T17:30:00.000Z",
    );
  });

  it("opens now in Thailand time and leaves the end date to the school", () => {
    // 18:05 UTC is 01:05 the next day in Bangkok.
    expect(
      createReferralFormDefaults(new Date("2026-10-11T18:05:00.000Z")),
    ).toEqual({
      startsOn: "2026-10-12",
      startsAt: "01:05",
      endsOn: "",
      endsAt: "01:05",
      agencyId: "",
      note: "",
    });
  });
});
