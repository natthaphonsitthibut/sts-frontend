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
});
