import { create } from "zustand";

const SCHOOL_FILTER_STORAGE_KEY = "sts_school_filter";

interface StoredSchoolFilter {
  province: string;
  district: string;
  subDistrict: string;
  schoolId: string;
  schoolName: string;
  /** Whose selection this is — a different account on the same browser must not inherit it. */
  userId: number | null;
}

interface SchoolFilterState extends StoredSchoolFilter {
  setFilter: (next: Partial<StoredSchoolFilter>) => void;
  clearAll: () => void;
}

const EMPTY: StoredSchoolFilter = {
  province: "",
  district: "",
  subDistrict: "",
  schoolId: "",
  schoolName: "",
  userId: null,
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readStored(): StoredSchoolFilter {
  if (!isBrowser()) return EMPTY;
  try {
    const raw = window.localStorage.getItem(SCHOOL_FILTER_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<StoredSchoolFilter>;
    return {
      province: typeof parsed.province === "string" ? parsed.province : "",
      district: typeof parsed.district === "string" ? parsed.district : "",
      subDistrict:
        typeof parsed.subDistrict === "string" ? parsed.subDistrict : "",
      schoolId: typeof parsed.schoolId === "string" ? parsed.schoolId : "",
      schoolName:
        typeof parsed.schoolName === "string" ? parsed.schoolName : "",
      userId: typeof parsed.userId === "number" ? parsed.userId : null,
    };
  } catch {
    return EMPTY;
  }
}

function writeStored(value: StoredSchoolFilter): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(SCHOOL_FILTER_STORAGE_KEY, JSON.stringify(value));
}

const initial = readStored();

/**
 * The school/area filter picked from any page — every page that browses one
 * school's data (or, on the pages that support it, one area's worth of
 * schools) reads the same value, so a pick on one page carries over
 * everywhere else. Persisted so it survives a refresh; tagged with the
 * account that picked it so a different sign-in on the same browser never
 * inherits a stranger's selection (see `useGlobalSchoolFilter`, which checks
 * the tag against the signed-in user before trusting this store).
 */
export const useSchoolFilterStore = create<SchoolFilterState>((set, get) => ({
  ...initial,
  setFilter: (next) => {
    const merged = { ...get(), ...next };
    writeStored(merged);
    set(merged);
  },
  clearAll: () => {
    writeStored(EMPTY);
    set(EMPTY);
  },
}));
