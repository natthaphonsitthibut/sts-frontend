import { z } from "zod";
import {
  CLASSROOM_STUDENT_PROBLEM_CATEGORIES,
  type ClassroomStudentProblemCategoryOption,
} from "../types/school-structure.types";

export function formatProblemCategoryOption(
  option: Pick<ClassroomStudentProblemCategoryOption, "label" | "guidance">,
): string {
  return option.guidance ? `${option.label} (${option.guidance})` : option.label;
}

export const classroomStudentCommentFormSchema = z.object({
  problemCategory: z.enum(CLASSROOM_STUDENT_PROBLEM_CATEGORIES, {
    error: "กรุณาเลือกหัวข้อปัญหา",
  }),
  problemDescription: z
    .string()
    .trim()
    .min(1, "กรุณากรอกคำอธิบาย")
    .max(2000, "คำอธิบายต้องไม่เกิน 2,000 ตัวอักษร"),
});

export type ClassroomStudentCommentFormValues = z.infer<
  typeof classroomStudentCommentFormSchema
>;
