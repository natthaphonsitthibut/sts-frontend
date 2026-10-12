import { z } from "zod";

/**
 * Thai consonants (U+0E01–0E2E), vowels and marks (U+0E30–0E3A, U+0E40–0E45, U+0E47–0E4E)
 * and ASCII letters/digits — no spaces or punctuation. The backend validates
 * with exactly this range; change both together.
 */
export const SUBJECT_CODE_PATTERN =
  /^(?:[\u0E01-\u0E2EA-Za-z0-9]|[\u0E30-\u0E3A]|[\u0E40-\u0E45]|[\u0E47-\u0E4E])+$/u;

export const curriculumSubjectFormSchema = z.object({
  subjectCode: z
    .string()
    .trim()
    .min(1, "กรุณาระบุรหัสวิชา")
    .max(20, "รหัสวิชาต้องไม่เกิน 20 ตัวอักษร")
    .regex(
      SUBJECT_CODE_PATTERN,
      "รหัสวิชาใช้ได้เฉพาะตัวอักษรไทย อังกฤษ และตัวเลข",
    ),
  subjectName: z
    .string()
    .trim()
    .min(1, "กรุณาระบุชื่อวิชา")
    .max(200, "ชื่อวิชาต้องไม่เกิน 200 ตัวอักษร"),
});

export type CurriculumSubjectFormValues = z.infer<
  typeof curriculumSubjectFormSchema
>;

export const EMPTY_CURRICULUM_SUBJECT_FORM: CurriculumSubjectFormValues = {
  subjectCode: "",
  subjectName: "",
};
