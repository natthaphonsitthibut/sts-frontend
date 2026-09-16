import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { useSchoolFilterStore } from "../store/school-filter.store";

function singleId(values: Array<string | number> | undefined): string {
  return values?.length === 1 ? String(values[0]) : "";
}

export interface GlobalSchoolFilter {
  province: string;
  district: string;
  subDistrict: string;
  schoolId: string;
  schoolName: string;
  /** A single-school actor's scope already fixes the school — no picker to show. */
  locked: boolean;
  /** Picking a school always fixes it to one — pass its own area so "back up" still works. */
  setSchool: (
    schoolId: string,
    schoolName: string,
    area?: { province?: string; district?: string; subDistrict?: string },
  ) => void;
  /** Narrowing to an area is never narrowing to one school within it. */
  setArea: (area: {
    province: string;
    district: string;
    subDistrict: string;
  }) => void;
  /**
   * "ทุกโรงเรียน" — every school *within whatever area is still set*, not a
   * full reset. Picking Bangkok then "all schools" means all of Bangkok, not
   * back to nationwide; only clearing the area itself goes that far.
   */
  clearSchool: () => void;
}

/**
 * The one school/area filter every browse/dashboard page reads — picking a
 * school (or, where a page supports it, just an area) on any of them carries
 * over to the rest (see `school-filter.store`). A locked (single-school)
 * actor never sees a picker: the school is read straight from their own
 * scope, using labels the session already carries (`data_scope_labels`,
 * `affiliation`) so this never triggers its own fetch.
 */
export function useGlobalSchoolFilter(): GlobalSchoolFilter {
  const user = useAuthSessionStore((state) => state.user);
  const stored = useSchoolFilterStore();

  const lockedSchoolId = singleId(user?.data_scope?.school_ids);
  const locked = Boolean(lockedSchoolId);

  // A selection persisted by a different account on this browser never
  // applies to whoever is signed in now.
  const ownedByCurrentUser = stored.userId === (user?.id ?? null);
  const effective = ownedByCurrentUser ? stored : null;

  const schoolId = locked ? lockedSchoolId : (effective?.schoolId ?? "");
  const schoolName = locked
    ? (user?.data_scope_labels?.schools?.find(
        (school) => String(school.id) === lockedSchoolId,
      )?.name ??
      user?.affiliation ??
      "")
    : (effective?.schoolName ?? "");
  const province = locked ? "" : (effective?.province ?? "");
  const district = locked ? "" : (effective?.district ?? "");
  const subDistrict = locked ? "" : (effective?.subDistrict ?? "");

  function setSchool(
    nextSchoolId: string,
    nextSchoolName: string,
    area?: { province?: string; district?: string; subDistrict?: string },
  ): void {
    if (locked || !user) return;
    useSchoolFilterStore.getState().setFilter({
      schoolId: nextSchoolId,
      schoolName: nextSchoolName,
      province: area?.province ?? province,
      district: area?.district ?? district,
      subDistrict: area?.subDistrict ?? subDistrict,
      userId: user.id,
    });
  }

  function setArea(area: {
    province: string;
    district: string;
    subDistrict: string;
  }): void {
    if (locked || !user) return;
    useSchoolFilterStore.getState().setFilter({
      ...area,
      schoolId: "",
      schoolName: "",
      userId: user.id,
    });
  }

  function clearSchool(): void {
    if (locked || !user) return;
    // `province`/`district`/`subDistrict` above are already the current
    // user's own values ("" if this store belongs to someone else) — write
    // them explicitly rather than merging over whatever the store already
    // holds, so a different account signed in on this browser can never
    // inherit a stranger's area once it re-tags the store with its own id.
    useSchoolFilterStore.getState().setFilter({
      province,
      district,
      subDistrict,
      schoolId: "",
      schoolName: "",
      userId: user.id,
    });
  }

  return {
    province,
    district,
    subDistrict,
    schoolId,
    schoolName,
    locked,
    setSchool,
    setArea,
    clearSchool,
  };
}
