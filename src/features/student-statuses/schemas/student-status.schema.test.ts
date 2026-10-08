import { describe, expect, it } from "vitest";
import { studentStatusFormSchema } from "./student-status.schema";

describe("studentStatusFormSchema", () => {
  it("explains length limits in Thai", () => {
    const result = studentStatusFormSchema.safeParse({
      code: "10",
      labelTh: "ก".repeat(101),
      category: "STUDYING",
      badgeVariant: "default",
      isActiveForLogin: true,
      isTerminal: false,
      requiresFollowup: false,
      isEnabled: true,
      sortOrder: "1",
      sourceSystem: "S".repeat(33),
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toContain(
      "ชื่อสถานะต้องไม่เกิน 100 ตัวอักษร",
    );
    expect(result.error.issues.map((issue) => issue.message)).toContain(
      "ระบบต้นทางต้องไม่เกิน 32 ตัวอักษร",
    );
  });
});
