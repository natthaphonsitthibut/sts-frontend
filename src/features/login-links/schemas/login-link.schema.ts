import { z } from "zod";

export const loginLinkFormSchema = z.object({
  assigned_to_name: z.string().trim().min(1, "กรุณากรอกชื่อผู้รับลิงก์"),
  assigned_to_email: z.string().trim(),
  role: z.string().trim().min(1, "กรุณาเลือกตำแหน่ง"),
  expires_value: z
    .string()
    .trim()
    .regex(/^\d+$/, "กรุณากรอกจำนวนเป็นตัวเลข")
    .refine((value) => Number(value) >= 1, "ต้องมากกว่า 0"),
  expires_unit: z.enum(["minutes", "hours", "days"]),
});

export type LoginLinkFormValues = z.infer<typeof loginLinkFormSchema>;

export const EMPTY_LOGIN_LINK_FORM: LoginLinkFormValues = {
  assigned_to_name: "",
  assigned_to_email: "",
  role: "",
  expires_value: "7",
  expires_unit: "days",
};
