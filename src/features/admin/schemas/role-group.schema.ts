import { z } from "zod";

export const roleGroupFormSchema = z.object({
  label: z.string().trim().min(1, "กรุณากรอกชื่อกลุ่มเมนู"),
  rank: z
    .string()
    .trim()
    .regex(/^\d+$/, "ลำดับขั้นต้องเป็นจำนวนเต็ม")
    .refine((value) => Number(value) >= 1, "ลำดับขั้นต้องตั้งแต่ 1"),
});

export type RoleGroupFormValues = z.infer<typeof roleGroupFormSchema>;
