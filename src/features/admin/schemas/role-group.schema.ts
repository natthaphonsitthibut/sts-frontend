import { z } from "zod";

/**
 * A menu group is a name and the pages it opens. The old numeric "ลำดับสิทธิ์"
 * is gone with the rank ladder it configured — authority is now decided by
 * whether a group reaches a page the operator does not hold.
 */
export const roleGroupFormSchema = z.object({
  label: z.string().trim().min(1, "กรุณากรอกชื่อกลุ่มเมนู"),
});

export type RoleGroupFormValues = z.infer<typeof roleGroupFormSchema>;
