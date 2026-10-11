import { z } from "zod";
import { formatThaiTime, getThaiDateKey } from "../../../lib/date-time";

const REFERRAL_WINDOW_ORDER_MESSAGE =
  "วันและเวลาสิ้นสุดต้องอยู่หลังวันและเวลาเริ่ม";

/** A Thailand calendar date and clock time as the instant the API stores. */
export function toReferralIsoDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00+07:00`).toISOString();
}

export const referralFormSchema = z
  .object({
    startsOn: z
      .string()
      .min(1, "กรุณาเลือกวันที่เริ่ม")
      .refine(
        (value) => !value || z.iso.date().safeParse(value).success,
        "วันที่เริ่มไม่ถูกต้อง",
      ),
    startsAt: z
      .string()
      .min(1, "กรุณาเลือกเวลาเริ่ม")
      .refine(
        (value) =>
          !value || z.iso.time({ precision: -1 }).safeParse(value).success,
        "เวลาเริ่มไม่ถูกต้อง",
      ),
    endsOn: z
      .string()
      .min(1, "กรุณาเลือกวันที่สิ้นสุด")
      .refine(
        (value) => !value || z.iso.date().safeParse(value).success,
        "วันที่สิ้นสุดไม่ถูกต้อง",
      ),
    endsAt: z
      .string()
      .min(1, "กรุณาเลือกเวลาสิ้นสุด")
      .refine(
        (value) =>
          !value || z.iso.time({ precision: -1 }).safeParse(value).success,
        "เวลาสิ้นสุดไม่ถูกต้อง",
      ),
    agencyId: z.string().min(1, "กรุณาเลือกหน่วยงานที่ส่งต่อ"),
    note: z
      .string()
      .trim()
      .min(1, "กรุณาระบุเหตุผลการส่งต่อ")
      .max(2000, "เหตุผลการส่งต่อต้องไม่เกิน 2,000 ตัวอักษร"),
  })
  .superRefine((values, context) => {
    if (
      !values.startsOn ||
      !values.startsAt ||
      !values.endsOn ||
      !values.endsAt ||
      !z.iso.date().safeParse(values.startsOn).success ||
      !z.iso.date().safeParse(values.endsOn).success ||
      !z.iso.time({ precision: -1 }).safeParse(values.startsAt).success ||
      !z.iso.time({ precision: -1 }).safeParse(values.endsAt).success
    ) {
      return;
    }
    if (
      toReferralIsoDateTime(values.endsOn, values.endsAt) <=
      toReferralIsoDateTime(values.startsOn, values.startsAt)
    ) {
      for (const path of ["endsOn", "endsAt"] as const) {
        context.addIssue({
          code: "custom",
          message: REFERRAL_WINDOW_ORDER_MESSAGE,
          path: [path],
        });
      }
    }
  });

export type ReferralFormValues = z.infer<typeof referralFormSchema>;

/** Opens now like a round's assignment; the end date is left for the school to pick. */
export function createReferralFormDefaults(
  now: Date = new Date(),
): ReferralFormValues {
  const time = formatThaiTime(now);
  return {
    startsOn: getThaiDateKey(now),
    startsAt: time,
    endsOn: "",
    endsAt: time,
    agencyId: "",
    note: "",
  };
}
