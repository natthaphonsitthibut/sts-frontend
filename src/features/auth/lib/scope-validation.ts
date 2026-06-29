import type { RoleScopeMode, RoleScopePolicy } from "../../admin/types/admin.types";
import type { DataScope } from "./permissions";

/**
 * Frontend mirror of the backend `getRoleScopeValidationError`
 * (sts-backend/src/auth/permissions.constants.ts). The backend remains the
 * security boundary — this only surfaces the same rule in the UI so a role
 * that cannot be saved with "ทั้งหมด" is guarded before submit instead of
 * failing afterwards. Keep the messages in sync with the backend verbatim.
 */

export type ScopeFieldState = "required" | "optional" | "forbidden";

export interface ScopeFieldStates {
  provinces: ScopeFieldState;
  districts: ScopeFieldState;
  sub_districts: ScopeFieldState;
  school_ids: ScopeFieldState;
  grade_levels: ScopeFieldState;
  room_ids: ScopeFieldState;
}

const ALL_OPTIONAL: ScopeFieldStates = {
  provinces: "optional",
  districts: "optional",
  sub_districts: "optional",
  school_ids: "optional",
  grade_levels: "optional",
  room_ids: "optional",
};

const ALL_FORBIDDEN: ScopeFieldStates = {
  provinces: "forbidden",
  districts: "forbidden",
  sub_districts: "forbidden",
  school_ids: "forbidden",
  grade_levels: "forbidden",
  room_ids: "forbidden",
};

/** Which scope fields a role may/must/cannot set, derived from its scope_mode. */
export function getScopeFieldStates(scopeMode: RoleScopeMode): ScopeFieldStates {
  switch (scopeMode) {
    case "flexible":
      return ALL_OPTIONAL;
    case "global":
      return ALL_FORBIDDEN;
    case "province":
      return { ...ALL_FORBIDDEN, provinces: "required" };
    case "district":
      return { ...ALL_FORBIDDEN, provinces: "required", districts: "required" };
    case "sub_district":
      return {
        ...ALL_FORBIDDEN,
        provinces: "required",
        districts: "required",
        sub_districts: "required",
      };
    case "school":
      return {
        ...ALL_FORBIDDEN,
        provinces: "required",
        districts: "required",
        sub_districts: "required",
        school_ids: "required",
      };
    default:
      return ALL_OPTIONAL;
  }
}

function count(values: Array<string | number> | undefined): number {
  return Array.isArray(values) ? values.length : 0;
}

/**
 * Returns a Thai error string when the scope does not satisfy the role's
 * scope_mode, or null when it is valid. Mirrors the backend messages exactly.
 */
export function getScopeValidationError(
  scopeMode: RoleScopeMode,
  scope: DataScope,
  roleLabel: string,
  scopePolicy: RoleScopePolicy = "ASSIGNABLE",
): string | null {
  const provinces = count(scope.provinces);
  const districts = count(scope.districts);
  const subDistricts = count(scope.sub_districts);
  const schools = count(scope.school_ids);
  const hasExtraSchoolFiltering = count(scope.grade_levels) > 0 || count(scope.room_ids) > 0;

  if (scopePolicy === "OWN_ONLY") {
    return scope.own_only === true ? null : `${roleLabel}ต้องใช้ขอบเขตข้อมูลเฉพาะตนเอง`;
  }

  if (scopeMode === "flexible") {
    const hasAreaScope =
      provinces > 0 ||
      districts > 0 ||
      subDistricts > 0 ||
      schools > 0 ||
      hasExtraSchoolFiltering;
    if (scope.global !== true && !hasAreaScope) {
      return `${roleLabel}ต้องเลือกขอบเขตข้อมูล หรือเลือกทั้งระบบ`;
    }
    if (scope.global === true && hasAreaScope) {
      return `${roleLabel}ห้ามเลือกทั้งระบบพร้อมกับพื้นที่`;
    }
    return scope.own_only === true ? `${roleLabel}ไม่สามารถใช้ขอบเขตเฉพาะตนเองได้` : null;
  }

  if (scopeMode === "global") {
    const hasAnyScope =
      provinces > 0 ||
      districts > 0 ||
      subDistricts > 0 ||
      schools > 0 ||
      hasExtraSchoolFiltering;
    return hasAnyScope ? `${roleLabel}ต้องใช้ขอบเขตข้อมูลระดับประเทศเท่านั้น` : null;
  }

  if (scopeMode === "province") {
    if (provinces !== 1) {
      return `${roleLabel}ต้องเลือกจังหวัด 1 แห่ง`;
    }
    if (districts > 0 || subDistricts > 0 || schools > 0 || hasExtraSchoolFiltering) {
      return `${roleLabel}ห้ามจำกัดอำเภอ ตำบล โรงเรียน ชั้น หรือห้อง`;
    }
  }

  if (scopeMode === "district") {
    if (provinces !== 1 || districts !== 1) {
      return `${roleLabel}ต้องเลือกจังหวัดและอำเภออย่างละ 1 รายการ`;
    }
    if (subDistricts > 0 || schools > 0 || hasExtraSchoolFiltering) {
      return `${roleLabel}ห้ามจำกัดตำบล โรงเรียน ชั้น หรือห้อง`;
    }
  }

  if (scopeMode === "sub_district") {
    if (provinces !== 1 || districts !== 1 || subDistricts !== 1) {
      return `${roleLabel}ต้องเลือกจังหวัด อำเภอ และตำบลอย่างละ 1 รายการ`;
    }
    if (schools > 0 || hasExtraSchoolFiltering) {
      return `${roleLabel}ห้ามจำกัดโรงเรียน ชั้น หรือห้อง`;
    }
  }

  if (scopeMode === "school") {
    if (provinces !== 1 || districts !== 1 || subDistricts !== 1 || schools !== 1) {
      return `${roleLabel}ต้องเลือกจังหวัด อำเภอ ตำบล และโรงเรียนอย่างละ 1 รายการ`;
    }
    if (hasExtraSchoolFiltering) {
      return `${roleLabel}ห้ามจำกัดระดับชั้นหรือห้องเรียน`;
    }
  }

  return null;
}
