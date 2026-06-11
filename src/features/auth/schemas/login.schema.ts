import { z } from "zod";

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, "กรุณากรอกชื่อผู้ใช้งาน"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export const thaidMockLoginSchema = z.object({
  personId: z
    .string()
    .transform((value) => value.replace(/\D/g, "").trim())
    .pipe(z.string().regex(/^\d{13}$/, "กรุณากรอกเลขบัตรประชาชน 13 หลัก")),
});

export type AdminLoginFormValues = z.input<typeof adminLoginSchema>;
export type AdminLoginPayload = z.output<typeof adminLoginSchema>;
export type ThaIdMockLoginFormValues = z.input<typeof thaidMockLoginSchema>;
export type ThaIdMockLoginPayload = z.output<typeof thaidMockLoginSchema>;
