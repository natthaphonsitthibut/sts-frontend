import { z } from "zod";

export const curriculumSubjectFormSchema = z.object({
  subjectCode: z
    .string()
    .trim()
    .min(1, "กรุณาระบุรหัสวิชา")
    .max(20, "รหัสวิชาต้องไม่เกิน 20 ตัวอักษร")
    .regex(
      /^[ก-ฮA-Za-z0-9]+$/,
      "รหัสวิชาใช้ได้เฉพาะตัวอักษรไทย อังกฤษ และตัวเลข",
    ),
  subjectName: z
    .string()
    .trim()
    .min(1, "กรุณาระบุชื่อวิชา")
    .max(200, "ชื่อวิชาต้องไม่เกิน 200 ตัวอักษร"),
});

/** Existing codes cannot be changed; legacy codes must remain editable. */
export const curriculumSubjectEditFormSchema =
  curriculumSubjectFormSchema.extend({
    subjectCode: z
      .string()
      .trim()
      .min(1, "กรุณาระบุรหัสวิชา")
      .max(20, "รหัสวิชาต้องไม่เกิน 20 ตัวอักษร"),
  });

export type CurriculumSubjectFormValues = z.infer<
  typeof curriculumSubjectFormSchema
>;

export const EMPTY_CURRICULUM_SUBJECT_FORM: CurriculumSubjectFormValues = {
  subjectCode: "",
  subjectName: "",
};
