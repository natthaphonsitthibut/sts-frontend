import { describe, expect, it } from "vitest";
import {
  EMPTY_TEACHER_FORM,
  teacherFormResolverSchema,
} from "./teacher.schema";

const filled = {
  ...EMPTY_TEACHER_FORM,
  firstName: "สมชาย",
  lastName: "ใจดี",
  citizenId: "1234567890123",
};

describe("teacherFormResolverSchema", () => {
  it("requires a national id when adding a teacher", () => {
    const schema = teacherFormResolverSchema(false);
    expect(schema.safeParse(filled).success).toBe(true);
    expect(schema.safeParse({ ...filled, citizenId: "" }).success).toBe(false);
  });

  // On edit the field stays masked until an authorised reveal unlocks it, so a
  // blank value means "unchanged" rather than "cleared".
  it("accepts the still-masked blank national id when editing", () => {
    const schema = teacherFormResolverSchema(true);
    expect(schema.safeParse({ ...filled, citizenId: "" }).success).toBe(true);
    expect(schema.safeParse({ ...filled, citizenId: "123" }).success).toBe(
      false,
    );
  });

  it("shows Thai length errors for teacher fields before submission", () => {
    const result = teacherFormResolverSchema(false).safeParse({
      ...filled,
      firstName: "ก".repeat(121),
      lineId: "L".repeat(65),
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "ชื่อต้องไม่เกิน 120 ตัวอักษร",
        "LINE ID ต้องไม่เกิน 64 ตัวอักษร",
      ]),
    );
  });
});
