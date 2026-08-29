/**
 * The words every scope filter uses for its own levels.
 *
 * A scope filter is the province → district → sub-district → school → grade →
 * room cascade that most list pages narrow by. The same six levels are built
 * by hand on a dozen pages, and the wording had already drifted — one page
 * offered "ทั้งหมด" where the rest offered "ทุกชั้น", another said
 * "ทุกระดับชั้น" — so the same filter read differently depending on where the
 * user happened to be. These maps are the single source: a page picks a level,
 * never a string, and a summary of the current scope can quote the option the
 * user actually chose instead of re-typing an approximation of it.
 */
export type ScopeLevel =
  | "province"
  | "district"
  | "subDistrict"
  | "school"
  | "grade"
  | "room";

/**
 * The "no narrowing here" option of a scope filter — the value that leaves the
 * level open rather than picking one of its members.
 */
export const SCOPE_ALL_LABEL: Record<ScopeLevel, string> = {
  province: "ทุกจังหวัด",
  district: "ทุกอำเภอ/เขต",
  subDistrict: "ทุกตำบล/แขวง",
  school: "ทุกโรงเรียน",
  grade: "ทุกชั้น",
  room: "ทุกห้อง",
};

/**
 * The placeholder of a scope field that must be filled in — an import that
 * needs a destination classroom, a check-in that needs a room. These fields
 * have no "all" member to fall back on, so they ask rather than describe.
 * Never use one as a filter's empty option: "เลือกห้อง" on a filter implies a
 * choice is still owed when the unfiltered list is a perfectly good answer.
 */
export const SCOPE_REQUIRED_LABEL: Record<ScopeLevel, string> = {
  province: "เลือกจังหวัด",
  district: "เลือกอำเภอ/เขต",
  subDistrict: "เลือกตำบล/แขวง",
  school: "เลือกโรงเรียน",
  grade: "เลือกชั้น",
  room: "เลือกห้อง",
};
