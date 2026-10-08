import { z } from "zod";
import {
  optionalEmail,
  optionalThaiPhone,
  thaiNationalId,
} from "../../../lib/validation";

export const teacherFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อ")
    .max(120, "ชื่อต้องไม่เกิน 120 ตัวอักษร"),
  lastName: z
    .string()
    .trim()
    .min(1, "กรุณากรอกนามสกุล")
    .max(120, "นามสกุลต้องไม่เกิน 120 ตัวอักษร"),
  citizenId: thaiNationalId,
  phone: optionalThaiPhone,
  email: optionalEmail.max(255, "อีเมลต้องไม่เกิน 255 ตัวอักษร"),
  lineId: z.string().trim().max(64, "LINE ID ต้องไม่เกิน 64 ตัวอักษร"),
});

/** Existing national id stays unchanged until an authorised reveal unlocks it. */
export const teacherEditFormSchema = teacherFormSchema.extend({
  citizenId: z.union([z.literal(""), thaiNationalId]),
});

export type TeacherFormValues = z.infer<typeof teacherFormSchema>;

/**
 * Hands the form one schema *type* rather than a union of two. Both variants
 * parse to `TeacherFormValues`, but a ternary between two distinct `ZodObject`s
 * leaves `zodResolver` with no overload to pick and makes the resolver's
 * transformed type drift away from the one `useForm` was given.
 */
export function teacherFormResolverSchema(
  isEdit: boolean,
): z.ZodType<TeacherFormValues, TeacherFormValues> {
  return isEdit ? teacherEditFormSchema : teacherFormSchema;
}

export const EMPTY_TEACHER_FORM: TeacherFormValues = {
  firstName: "",
  lastName: "",
  citizenId: "",
  phone: "",
  email: "",
  lineId: "",
};
