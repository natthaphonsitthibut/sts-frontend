import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import {
  attendanceLookupService,
  type SchoolOption,
} from "../../tasks/api/attendance-lookup.service";

const EMPTY_SCHOOLS: SchoolOption[] = [];
const SCHOOL_LIMIT = 50;

function unique(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  ).sort();
}

/**
 * Province → district → sub-district → school cascade, server-driven.
 *
 * Geo options come from the bounded `/locations` catalog (not a nationwide
 * school dump). The school list always fetches from the server, narrowed by
 * whichever geo levels and search term are set and enforced against the
 * actor's data scope — the server already caps results at `SCHOOL_LIMIT` and
 * returns nothing for an unscoped/own-only actor, so no flow ever pulls the
 * whole country's schools. Selecting a level resets the levels below it.
 */
export function useSchoolAreaFilter(
  initial: {
    province?: string;
    district?: string;
    subDistrict?: string;
    schoolSearch?: string;
    /** Skip the geographic catalog for school-only pickers. */
    includeLocations?: boolean;
  } = {},
) {
  const includeLocations = initial.includeLocations ?? true;
  const [province, setProvinceState] = useState(initial.province ?? "");
  const [district, setDistrictState] = useState(initial.district ?? "");
  const [subDistrict, setSubDistrict] = useState(initial.subDistrict ?? "");
  const [schoolSearch, setSchoolSearch] = useState(initial.schoolSearch ?? "");

  // The area catalog is the public one — every onboarded school's province,
  // district and sub-district, ungated because the guest home-visit form needs
  // it before anyone signs in. An account only ever narrows within its own
  // scope, so a director of one district was being offered all 77 provinces to
  // pick from, none of which would have changed their results.
  const actorScope = useAuthSessionStore((state) => state.user?.data_scope);

  const locationsQuery = useQuery({
    queryKey: ["attendance-locations"],
    queryFn: attendanceLookupService.getLocations,
    enabled: includeLocations,
  });
  const catalog = locationsQuery.data;

  // A scope that names areas also implies the levels above it: someone scoped
  // to one district belongs to exactly one province, so that province is not a
  // choice either. Levels the scope leaves open stay open.
  const scopedRows = useMemo(() => {
    const rows = catalog?.subDistricts ?? [];
    const byProvince = actorScope?.provinces?.length
      ? rows.filter((row) => actorScope.provinces?.includes(row.province))
      : rows;
    const byDistrict = actorScope?.districts?.length
      ? byProvince.filter((row) => actorScope.districts?.includes(row.district))
      : byProvince;
    return actorScope?.sub_districts?.length
      ? byDistrict.filter((row) =>
          actorScope.sub_districts?.includes(row.sub_district),
        )
      : byDistrict;
  }, [catalog, actorScope]);

  const provinces = useMemo(
    () => unique(scopedRows.map((row) => row.province)),
    [scopedRows],
  );
  const districts = useMemo(
    () =>
      unique(
        scopedRows
          .filter((row) => !province || row.province === province)
          .map((row) => row.district),
      ),
    [scopedRows, province],
  );
  const subDistricts = useMemo(
    () =>
      unique(
        scopedRows
          .filter((row) => !province || row.province === province)
          .filter((row) => !district || row.district === district)
          .map((row) => row.sub_district),
      ),
    [scopedRows, province, district],
  );

  const trimmedSearch = schoolSearch.trim();
  // Always fetch: the server caps at SCHOOL_LIMIT and enforces the actor's
  // data scope, so an unnarrowed query is already safe and just returns the
  // first page of schools instead of an empty "pick a province" dead end.
  const schoolsEnabled = true;

  const schoolsQuery = useQuery({
    queryKey: [
      "attendance-area-schools",
      province,
      district,
      subDistrict,
      trimmedSearch,
    ],
    queryFn: () =>
      attendanceLookupService.getSchools({
        province: province || undefined,
        district: district || undefined,
        subDistrict: subDistrict || undefined,
        searchTerm: trimmedSearch || undefined,
        limit: SCHOOL_LIMIT,
      }),
    enabled: schoolsEnabled,
  });
  const schools = schoolsQuery.data ?? EMPTY_SCHOOLS;

  function setProvince(value: string): void {
    setSchoolSearch("");
    setProvinceState(value);
    setDistrictState("");
    setSubDistrict("");
  }

  function setDistrict(value: string): void {
    setSchoolSearch("");
    setDistrictState(value);
    setSubDistrict("");
  }

  function setSubDistrictValue(value: string): void {
    setSchoolSearch("");
    setSubDistrict(value);
  }

  function setAreaFromSchool(school: SchoolOption | undefined): void {
    setSchoolSearch("");
    if (!school) return;
    setProvinceState(school.province ?? "");
    setDistrictState(school.district ?? "");
    setSubDistrict(school.sub_district ?? "");
  }

  function reset(): void {
    setProvinceState("");
    setDistrictState("");
    setSubDistrict("");
    setSchoolSearch("");
  }

  return {
    province,
    district,
    subDistrict,
    provinces,
    districts,
    subDistricts,
    schools,
    /** Schools are already narrowed server-side; alias kept for call sites. */
    filteredSchools: schools,
    schoolSearch,
    setSchoolSearch,
    setProvince,
    setDistrict,
    setSubDistrict: setSubDistrictValue,
    setAreaFromSchool,
    reset,
    schoolsEnabled,
    dataUpdatedAt: Math.max(
      locationsQuery.dataUpdatedAt,
      schoolsQuery.dataUpdatedAt,
    ),
    isLoading:
      (includeLocations && locationsQuery.isLoading) ||
      (schoolsEnabled && schoolsQuery.isLoading),
    isError:
      (includeLocations && locationsQuery.isError) || schoolsQuery.isError,
    refetch: () =>
      Promise.all([
        ...(includeLocations ? [locationsQuery.refetch()] : []),
        schoolsQuery.refetch(),
      ]),
  };
}
