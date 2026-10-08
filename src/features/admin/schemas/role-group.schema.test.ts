import { describe, expect, it } from "vitest";
import { roleGroupFormSchema } from "./role-group.schema";

describe("roleGroupFormSchema", () => {
  it("rejects an overlong group name with a Thai message", () => {
    const result = roleGroupFormSchema.safeParse({ label: "ก".repeat(101) });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.message).toBe(
      "ชื่อกลุ่มเมนูต้องไม่เกิน 100 ตัวอักษร",
    );
  });
});
