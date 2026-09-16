import { z } from "zod";

export const adminLoginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อผู้ใช้งาน")
    .max(50, "ชื่อผู้ใช้งานต้องไม่เกิน 50 ตัวอักษร"),
  password: z
    .string()
    .min(1, "กรุณากรอกรหัสผ่าน")
    .max(50, "รหัสผ่านต้องไม่เกิน 50 ตัวอักษร"),
});

export type AdminLoginFormValues = z.input<typeof adminLoginSchema>;
export type AdminLoginPayload = z.output<typeof adminLoginSchema>;
