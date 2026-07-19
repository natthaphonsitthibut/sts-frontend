import { z } from "zod";

export const openCaseSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "กรุณาระบุเหตุผลที่ต้องเปิดเคส")
    .max(1000, "เหตุผลต้องไม่เกิน 1,000 ตัวอักษร"),
});

export type OpenCaseFormValues = z.infer<typeof openCaseSchema>;
