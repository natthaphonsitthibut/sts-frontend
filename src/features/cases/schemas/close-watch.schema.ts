import { z } from "zod";

// The reason is optional (owner, 2026-10-15).
export const closeWatchSchema = z.object({
  note: z.string().trim().max(1000, "หมายเหตุต้องไม่เกิน 1,000 ตัวอักษร"),
});

export type CloseWatchFormValues = z.infer<typeof closeWatchSchema>;
