import { z } from "zod";
import { STUDENT_STATUS_CATEGORIES } from "../types/student-status.types";

const nonNegativeInteger = (label: string, max = 2_147_483_647) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, `${label}ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป`)
    .refine((value) => Number(value) <= max, `${label}มีค่ามากเกินไป`);

export const studentStatusFormSchema = z.object({
  code: nonNegativeInteger("รหัสสถานะ"),
  labelTh: z.string().trim().min(1, "กรุณากรอกชื่อสถานะ").max(100),
  category: z.enum(STUDENT_STATUS_CATEGORIES),
  isActiveForLogin: z.boolean(),
  isTerminal: z.boolean(),
  requiresFollowup: z.boolean(),
  isEnabled: z.boolean(),
  sortOrder: nonNegativeInteger("ลำดับ", 32767),
  sourceSystem: z.string().trim().min(1, "กรุณากรอกระบบต้นทาง").max(32),
});

export type StudentStatusFormValues = z.infer<typeof studentStatusFormSchema>;
