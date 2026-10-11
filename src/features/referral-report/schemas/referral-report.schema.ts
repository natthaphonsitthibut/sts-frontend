import { z } from "zod";
import { getThaiDateKey } from "../../../lib/date-time";

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

export const referralReportFormSchema = z.object({
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
  note: z
    .string()
    .trim()
    .min(1, "กรุณาสรุปการดำเนินการและผล")
    .max(2000, "สรุปต้องไม่เกิน 2,000 ตัวอักษร"),
});

export type ReferralReportFormValues = z.infer<typeof referralReportFormSchema>;

/**
 * The form's values while it is being filled in. Same shape as the validated
 * report; `resultCode` is an empty string until the agency picks a result.
 */
export type ReferralReportDraft = z.input<typeof referralReportFormSchema>;

export function createReferralReportDefaults(): ReferralReportDraft {
  return {
    resultCode: "",
    actionDate: getThaiDateKey(),
    note: "",
  };
}
