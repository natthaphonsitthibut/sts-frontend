import { getScopeValidationError } from "./scope-validation";
import { describe, expect, it } from "vitest";

describe("scope restrictions", () => {
  it("allows a school account to stop at one school", () => {
    expect(
      getScopeValidationError(
        "flexible",
        { school_ids: [1001] },
        "ผู้ดูแลระบบ",
        "ASSIGNABLE",
        { disallowClassroomScope: true, requireSchoolScope: true },
      ),
    ).toBeNull();
  });

  it("rejects a school account without a school even when an area is selected", () => {
    expect(
      getScopeValidationError(
        "flexible",
        { provinces: ["ชลบุรี"] },
        "ผู้ดูแลระบบ",
        "ASSIGNABLE",
        { disallowClassroomScope: true, requireSchoolScope: true },
      ),
    ).toContain("ต้องเลือกโรงเรียน 1 แห่ง");
  });

  it("rejects grade or room narrowing for a school account", () => {
    expect(
      getScopeValidationError(
        "flexible",
        { school_ids: [1001], grade_levels: [1] },
        "ผู้ดูแลระบบ",
        "ASSIGNABLE",
        { disallowClassroomScope: true },
      ),
    ).toContain("ห้ามจำกัดระดับชั้น");
  });

  it("rejects a school selection for a council account", () => {
    expect(
      getScopeValidationError(
        "flexible",
        { provinces: ["ชลบุรี"], school_ids: [1001] },
        "ผู้ดูแลระบบ",
        "ASSIGNABLE",
        { disallowSchoolScope: true, disallowClassroomScope: true },
      ),
    ).toContain("ห้ามจำกัดโรงเรียน");
  });
});
