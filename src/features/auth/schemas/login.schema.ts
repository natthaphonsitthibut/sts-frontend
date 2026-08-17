import { z } from "zod";

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, "กรุณากรอกชื่อผู้ใช้งาน"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export type AdminLoginFormValues = z.input<typeof adminLoginSchema>;
export type AdminLoginPayload = z.output<typeof adminLoginSchema>;
