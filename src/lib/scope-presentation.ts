import { formatClassLabel } from "./room-presentation";

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

/** The levels currently in force, however the page came by them. */
export interface ScopeSummaryInput {
  province?: string | null;
  district?: string | null;
  subDistrict?: string | null;
  schoolName?: string | null;
  grade?: string | null;
  room?: string | null;
  /** Only pages that let the user pick a term carry these. */
  academicYear?: number | string | null;
  semester?: number | string | null;
}

function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/**
 * The scope in force, as the one or two phrases worth putting on screen.
 *
 * Every level the user walked through is *not* worth showing: a school already
 * says which province it is in, so once one is picked the geography is noise —
 * the reason the server's own six-part "เชียงใหม่ / สันทราย / … / ห้อง 3" reads
 * as a wall. What survives is the deepest place plus the classroom, at most two
 * phrases.
 *
 * The place keeps its province when it is an area rather than a school, because
 * a district on its own is genuinely ambiguous — "เมือง" names a district in
 * every one of the 77 provinces. Levels are quoted exactly as the filter's own
 * option reads them, never re-worded and never prefixed: the stored values
 * already carry their own "จังหวัด"/"อำเภอ"/"เขต" wording inconsistently (the
 * area-code migration has to strip it to match rows), so a hand-added "อ." can
 * land on a value that reads "เขตบางรัก" and produce "อ.เขตบางรัก".
 */
export function formatScopeSummary(scope: ScopeSummaryInput): string[] {
  const province = clean(scope.province);
  const area = clean(scope.subDistrict) || clean(scope.district);
  const schoolName = clean(scope.schoolName);
  const grade = clean(scope.grade);
  const room = clean(scope.room);

  const place = schoolName
    ? schoolName
    : area
      ? province
        ? `${province} › ${area}`
        : area
      : province || SCOPE_ALL_LABEL.province;

  const classroom = grade || room ? formatClassLabel(grade, room) : "";

  // A term is only worth naming once the user has moved off the default: a page
  // sitting on the current year says nothing by repeating it, while a page
  // showing 2566 must not look like it is showing today.
  const academicYear = clean(
    scope.academicYear == null ? "" : String(scope.academicYear),
  );
  const semester = clean(scope.semester == null ? "" : String(scope.semester));

  return [
    place,
    ...(classroom && classroom !== "-" ? [classroom] : []),
    ...(academicYear ? [`ปีการศึกษา ${academicYear}`] : []),
    ...(semester ? [`ภาคเรียนที่ ${semester}`] : []),
  ];
}

/**
 * Where a school is, as the second line of its option in a picker.
 *
 * School names are not unique in Thailand — the same name recurs across
 * provinces — so a list of names alone can offer two rows an admin cannot tell
 * apart. This line separates them, and because the picker searches it too, it
 * doubles as the way to reach a district's schools by typing the district
 * rather than walking a province → district → sub-district cascade.
 *
 * Deepest first, and no "จ."/"อ." prefixes: the stored values already carry
 * that wording inconsistently, so adding it produces "อ.เขตบางรัก".
 */
export function formatSchoolArea(school: {
  province?: string | null;
  district?: string | null;
  /** `/attendance/schools` spells it this way; the school-structure API camelCases it. */
  sub_district?: string | null;
  subDistrict?: string | null;
}): string | undefined {
  const parts = [
    clean(school.subDistrict ?? school.sub_district),
    clean(school.district),
    clean(school.province),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}
