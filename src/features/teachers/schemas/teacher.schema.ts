import { z } from "zod";
import {
  optionalEmail,
  optionalThaiPhone,
  thaiNationalId,
} from "../../../lib/validation";

export const teacherFormSchema = z.object({
  firstName: z.string().trim().min(1, "กรุณากรอกชื่อ"),
  lastName: z.string().trim().min(1, "กรุณากรอกนามสกุล"),
  citizenId: thaiNationalId,
  phone: optionalThaiPhone,
  email: optionalEmail,
  lineId: z.string().trim().max(64),
});

/** Existing national id stays unchanged until an authorised reveal unlocks it. */
export const teacherEditFormSchema = teacherFormSchema.extend({
  citizenId: z.union([z.literal(""), thaiNationalId]),
});

export type TeacherFormValues = z.infer<typeof teacherFormSchema>;

export const EMPTY_TEACHER_FORM: TeacherFormValues = {
  firstName: "",
  lastName: "",
  citizenId: "",
  phone: "",
  email: "",
  lineId: "",
};
