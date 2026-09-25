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

/** Phone: required, must be 9–10 digits. */
export const requiredThaiPhone = z
  .string()
  .trim()
  .min(1, "กรุณากรอกเบอร์โทรศัพท์")
  .regex(THAI_PHONE, "เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก");

/** Email: optional, but if filled must be a valid address. */
export const optionalEmail = z
  .string()
  .trim()
  .refine(
    (value) =>
      value.length === 0 || z.string().email().safeParse(value).success,
    {
      message: "รูปแบบอีเมลไม่ถูกต้อง",
    },
  );

/** Optional map latitude with Thai messages for direct coordinate entry. */
export const nullableLatitude = z
  .number({ error: "ละติจูดต้องเป็นตัวเลข" })
  .min(-90, "ละติจูดต้องอยู่ระหว่าง -90 ถึง 90")
  .max(90, "ละติจูดต้องอยู่ระหว่าง -90 ถึง 90")
  .nullable();

/** Optional map longitude with Thai messages for direct coordinate entry. */
export const nullableLongitude = z
  .number({ error: "ลองจิจูดต้องเป็นตัวเลข" })
  .min(-180, "ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180")
  .max(180, "ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180")
  .nullable();

/**
 * Usernames and passwords: 8–50 characters of English letters, digits and
 * printable symbols — no Thai, no spaces (owner, 2026-09-25). Mirrors
 * `CREDENTIAL_PATTERN` in the backend's users DTO.
 */
export const CREDENTIAL_MIN_LENGTH = 8;
export const CREDENTIAL_MAX_LENGTH = 50;
const CREDENTIAL_PATTERN = /^[\x21-\x7E]+$/;
const CREDENTIAL_CHARACTERS_HINT =
  "ใช้ได้เฉพาะภาษาอังกฤษ ตัวเลข และอักขระพิเศษ ห้ามเว้นวรรค";

function credential(label: string) {
  return z
    .string()
    .min(
      CREDENTIAL_MIN_LENGTH,
      `${label}ต้องมีอย่างน้อย ${CREDENTIAL_MIN_LENGTH} ตัวอักษร`,
    )
    .max(
      CREDENTIAL_MAX_LENGTH,
      `${label}ต้องไม่เกิน ${CREDENTIAL_MAX_LENGTH} ตัวอักษร`,
    )
    .regex(CREDENTIAL_PATTERN, `${label}${CREDENTIAL_CHARACTERS_HINT}`);
}

/** A username being set or changed. */
export const newUsername = credential("ชื่อผู้ใช้งาน");

/** A password being set or changed. */
export const newPassword = credential("รหัสผ่าน");

/** Strip anything that is not a digit — used to guard numeric inputs. */
export function keepDigits(value: string): string {
  return value.replace(/\D/g, "");
}
