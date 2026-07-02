import { z } from "zod";
import type { MasterDataLookupConfig } from "../types/master-data-lookup.types";

export const masterDataLookupFormSchema = (config: MasterDataLookupConfig) =>
  z
    .object({
      code: z.string().trim().min(1, "กรุณากรอกรหัส"),
      name: z.string().trim().min(1, "กรุณากรอกชื่อ"),
      note: z.string().optional(),
      isActive: z.boolean(),
      legalCategory: z.string().optional(),
      categoryId: z.string().optional(),
    })
    .superRefine((values, context) => {
      if (config.hasCategory && !values.categoryId) {
        context.addIssue({
          code: "custom",
          message: "กรุณาเลือกหมวดเหตุผล",
          path: ["categoryId"],
        });
      }
    });

export type MasterDataLookupFormValues = z.infer<
  ReturnType<typeof masterDataLookupFormSchema>
>;
