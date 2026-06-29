import { z } from "zod";

export const roleGroupFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "กรุณากรอกรหัส role (ภาษาอังกฤษ)")
    .regex(
      /^[A-Z][A-Z0-9_]{1,49}$/,
      "ต้องขึ้นต้นด้วยตัวพิมพ์ใหญ่ ตามด้วยตัวพิมพ์ใหญ่ ตัวเลข หรือ _ (2–50 ตัว)",
    ),
  label: z.string().trim().min(1, "กรุณากรอกชื่อที่แสดง"),
  rank: z
    .string()
    .trim()
    .regex(/^\d+$/, "ลำดับขั้นต้องเป็นจำนวนเต็ม")
    .refine((value) => Number(value) >= 1, "ลำดับขั้นต้องตั้งแต่ 1"),
});

export type RoleGroupFormValues = z.infer<typeof roleGroupFormSchema>;
