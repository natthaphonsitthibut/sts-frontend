import { z } from "zod";

/**
 * Shared field-level validators so every form enforces the same rules the
 * backend does. Keep these in sync with the backend DTO decorators — the
 * backend stays the source of truth; these only move the feedback earlier.
 */

const DIGITS_13 = /^\d{13}$/;
const THAI_PHONE = /^\d{9,10}$/;

/** Thai national ID: exactly 13 digits, required. */
export const thaiNationalId = z
  .string()
  .trim()
  .min(1, "กรุณากรอกเลขบัตรประชาชน")
  .regex(DIGITS_13, "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก");

/** Phone: optional, but if filled must be 9–10 digits. */
export const optionalThaiPhone = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || THAI_PHONE.test(value), {
    message: "เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก",
  });

/** Email: optional, but if filled must be a valid address. */
export const optionalEmail = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || z.string().email().safeParse(value).success, {
    message: "รูปแบบอีเมลไม่ถูกต้อง",
  });

/** Strip anything that is not a digit — used to guard numeric inputs. */
export function keepDigits(value: string): string {
  return value.replace(/\D/g, "");
}
