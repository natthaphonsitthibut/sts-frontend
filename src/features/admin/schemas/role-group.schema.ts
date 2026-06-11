import { z } from "zod";

export const roleGroupFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "กรุณากรอกรหัส role (ภาษาอังกฤษ)")
    .regex(/^[A-Z0-9_]+$/, "ใช้ตัวพิมพ์ใหญ่ ตัวเลข และ _ เท่านั้น"),
  label: z.string().trim().min(1, "กรุณากรอกชื่อที่แสดง"),
  rank: z
    .string()
    .trim()
    .regex(/^\d+$/, "ลำดับขั้นต้องเป็นจำนวนเต็ม")
    .refine((value) => Number(value) >= 1, "ลำดับขั้นต้องตั้งแต่ 1"),
  scope_mode: z.enum([
    "flexible",
    "global",
    "province",
    "district",
    "sub_district",
    "school",
  ]),
});

export type RoleGroupFormValues = z.infer<typeof roleGroupFormSchema>;
