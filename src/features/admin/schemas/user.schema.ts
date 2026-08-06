import { z } from "zod";
import { optionalEmail, requiredThaiPhone } from "../../../lib/validation";

export const userFormSchema = z.object({
  username: z.string().trim().min(1, "กรุณากรอกชื่อผู้ใช้งาน"),
  password: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || value.length >= 8, {
      message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
    }),
  FirstName: z.string().trim().min(1, "กรุณากรอกชื่อ"),
  LastName: z.string().trim().min(1, "กรุณากรอกนามสกุล"),
  PersonID_Onec: z
    .string()
    .trim()
    .regex(/^\d{13}$/, "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก"),
  phone: requiredThaiPhone,
  email: optionalEmail.refine((value) => value.length > 0, {
    message: "กรุณากรอกอีเมล",
  }),
  affiliation: z.string().trim().min(1, "กรุณากรอกสังกัด"),
  role: z.string().trim().min(1, "กรุณาเลือกบทบาท"),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export const EMPTY_USER_FORM: UserFormValues = {
  username: "",
  password: "",
  FirstName: "",
  LastName: "",
  PersonID_Onec: "",
  phone: "",
  email: "",
  affiliation: "",
  role: "",
};
