import { z } from "zod";
import { formatThaiTime, getThaiDateKey } from "../../../lib/date-time";
import { toReferralIsoDateTime } from "../../cases/schemas/referral.schema";

export const REFERRAL_ACCESS_CODE_LENGTH = 6;

export const referralAccessCodeSchema = z.object({
  accessCode: z
    .string()
    .regex(
      new RegExp(`^\\d{${REFERRAL_ACCESS_CODE_LENGTH}}$`),
      `กรุณากรอกรหัส ${REFERRAL_ACCESS_CODE_LENGTH} หลัก`,
    ),
});

export type ReferralAccessCodeValues = z.infer<typeof referralAccessCodeSchema>;

export const referralReportFormSchema = z
  .object({
    // Empty until the agency picks one; the enum turns that into the message.
    resultCode: z
      .enum(["", "SUCCEEDED", "NOT_SUCCEEDED"], {
        message: "กรุณาเลือกผลการดำเนินการ",
      })
      .refine((value) => value !== "", "กรุณาเลือกผลการดำเนินการ"),
    actionDate: z
      .string()
      .min(1, "กรุณาเลือกวันที่ดำเนินการ")
      .refine(
        (value) => !value || z.iso.date().safeParse(value).success,
        "วันที่ดำเนินการไม่ถูกต้อง",
      )
      .refine((value) => !value || value <= getThaiDateKey(), {
        message: "วันที่ดำเนินการต้องไม่เกินวันนี้",
      }),
    actionTime: z.string().regex(/^\d{2}:\d{2}$/, "กรุณาเลือกเวลาที่ดำเนินการ"),
    note: z
      .string()
      .trim()
      .min(1, "กรุณาสรุปการดำเนินการและผล")
      .max(2000, "สรุปต้องไม่เกิน 2,000 ตัวอักษร"),
  })
  .superRefine((values, context) => {
    // Only once both parts are valid; their own messages cover the rest.
    if (!z.iso.date().safeParse(values.actionDate).success) return;
    if (!/^\d{2}:\d{2}$/.test(values.actionTime)) return;
    const actionAt = new Date(
      `${values.actionDate}T${values.actionTime}:00+07:00`,
    );
    if (Number.isNaN(actionAt.getTime())) return;
    if (actionAt.getTime() > Date.now()) {
      context.addIssue({
        code: "custom",
        message: "วันและเวลาที่ดำเนินการต้องไม่อยู่ในอนาคต",
        path: ["actionTime"],
      });
    }
  });

export type ReferralReportFormValues = z.infer<typeof referralReportFormSchema>;

/**
 * The form's values while it is being filled in. Same shape as the validated
 * report; `resultCode` is an empty string until the agency picks a result.
 */
export type ReferralReportDraft = z.input<typeof referralReportFormSchema>;

/** ผลการดำเนินการ starts at สำเร็จ, the usual answer (owner, 2026-10-15). */
export function createReferralReportDefaults(
  now: Date = new Date(),
): ReferralReportDraft {
  return {
    resultCode: "SUCCEEDED",
    actionDate: getThaiDateKey(now),
    actionTime: formatThaiTime(now),
    note: "",
  };
}

/** The report's วันและเวลาที่ดำเนินการ as the instant the API stores. */
export function toReferralActionAt(date: string, time: string): string {
  return toReferralIsoDateTime(date, time);
}
