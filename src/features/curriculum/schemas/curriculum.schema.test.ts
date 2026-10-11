import { describe, expect, it } from "vitest";
import {
  SUBJECT_CODE_PATTERN,
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

  it("accepts Thai codes written with vowels and tone marks", () => {
    // Regression: only ก-ฮ was allowed, so a code such as "ภาษา101" failed.
    for (const subjectCode of ["ภาษา101", "เคมี1", "ศิลป์2", "ฮ1", "ไ๎1"]) {
      expect(
        fieldMessages({ ...validSubject, subjectCode }, "subjectCode"),
      ).toEqual([]);
    }
  });

  it("allows exactly the Thai ranges agreed with the backend", () => {
    const agreed = (codePoint: number) =>
      (codePoint >= 0x0e01 && codePoint <= 0x0e2e) ||
      (codePoint >= 0x0e30 && codePoint <= 0x0e3a) ||
      (codePoint >= 0x0e40 && codePoint <= 0x0e45) ||
      (codePoint >= 0x0e47 && codePoint <= 0x0e4e);

    for (let codePoint = 0x0e00; codePoint <= 0x0e7f; codePoint += 1) {
      expect(
        SUBJECT_CODE_PATTERN.test(String.fromCodePoint(codePoint)),
        `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`,
      ).toBe(agreed(codePoint));
    }
  });

  it("rejects spaces, punctuation and Thai symbols outside the range", () => {
    for (const subjectCode of [
      "ค 21101",
      "ค-21101",
      "ค.21101",
      "ค21101ฯ", // U+0E2F
      "ค21101฿", // U+0E3F
      "ค21101ๆ", // U+0E46 punctuation
      "ค21101๏", // U+0E4F
      "ค๑๒", // Thai digits
      "ค21101_",
    ]) {
      expect(
        fieldMessages({ ...validSubject, subjectCode }, "subjectCode"),
      ).toContain("รหัสวิชาใช้ได้เฉพาะตัวอักษรไทย อังกฤษ และตัวเลข");
    }
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
