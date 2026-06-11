import { z } from "zod";

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
  PersonID_Onec: z.string().trim().min(1, "กรุณากรอกเลขบัตรประชาชน"),
  phone: z.string().trim(),
  email: z.string().trim(),
  affiliation: z.string().trim(),
  role: z.string().trim().min(1, "กรุณาเลือกตำแหน่ง"),
  status: z.string().trim().min(1),
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
  status: "ACTIVE",
};
