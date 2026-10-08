import { describe, expect, it } from "vitest";
import {
  curriculumSubjectEditFormSchema,
  curriculumSubjectFormSchema,
} from "./curriculum.schema";

const validSubject = { subjectCode: "ค21101", subjectName: "คณิตศาสตร์" };

function fieldMessages(
  values: typeof validSubject,
  field: keyof typeof validSubject,
) {
  const result = curriculumSubjectFormSchema.safeParse(values);
  if (result.success) return [];
  return result.error.issues
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message);
}

describe("curriculumSubjectFormSchema", () => {
  it("accepts Thai and English subject codes with digits", () => {
    expect(fieldMessages(validSubject, "subjectCode")).toEqual([]);
    expect(
      fieldMessages({ ...validSubject, subjectCode: "M22101" }, "subjectCode"),
    ).toEqual([]);
  });

  it("explains invalid subject codes in Thai", () => {
    expect(
      fieldMessages({ ...validSubject, subjectCode: "M21/01" }, "subjectCode"),
    ).toContain("รหัสวิชาใช้ได้เฉพาะตัวอักษรไทย อังกฤษ และตัวเลข");
    expect(
      fieldMessages(
        { ...validSubject, subjectCode: "A".repeat(21) },
        "subjectCode",
      ),
    ).toContain("รหัสวิชาต้องไม่เกิน 20 ตัวอักษร");
  });

  it("explains an overlong subject name in Thai", () => {
    expect(
      fieldMessages(
        { ...validSubject, subjectName: "ก".repeat(201) },
        "subjectName",
      ),
    ).toContain("ชื่อวิชาต้องไม่เกิน 200 ตัวอักษร");
  });

  it("allows editing a legacy subject while its code stays unchanged", () => {
    expect(
      curriculumSubjectEditFormSchema.safeParse({
        ...validSubject,
        subjectCode: "M21/01",
      }).success,
    ).toBe(true);
  });
});
