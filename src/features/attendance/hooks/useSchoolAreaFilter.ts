import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  attendanceLookupService,
  type SchoolOption,
} from "../../tasks/api/attendance-lookup.service";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";

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
 * school dump), and the school list is fetched from the server narrowed by the
 * selected geo and enforced against the actor's data scope. A scoped actor
 * (school/area/own) loads immediately because the server already narrows their
 * result; a national/global actor must pick a province (or type a 2+ char
 * search) before we fetch, so no flow ever pulls the whole country's schools.
 * Selecting a level resets the levels below it.
 */
export function useSchoolAreaFilter() {
  const actorScope = useAuthSessionStore((state) => state.user?.data_scope);
  const [province, setProvinceState] = useState("");
  const [district, setDistrictState] = useState("");
  const [subDistrict, setSubDistrict] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");

  const locationsQuery = useQuery({
    queryKey: ["attendance-locations"],
    queryFn: attendanceLookupService.getLocations,
  });
  const catalog = locationsQuery.data;

  const provinces = useMemo(
    () => [...(catalog?.provinces ?? [])].sort(),
    [catalog],
  );
  const districts = useMemo(
    () =>
      unique(
        (catalog?.districts ?? [])
          .filter((row) => !province || row.province === province)
          .map((row) => row.district),
      ),
    [catalog, province],
  );
  const subDistricts = useMemo(
    () =>
      unique(
        (catalog?.subDistricts ?? [])
          .filter((row) => !province || row.province === province)
          .filter((row) => !district || row.district === district)
          .map((row) => row.sub_district),
      ),
    [catalog, province, district],
  );

  // A scoped actor is already narrowed server-side, so we can load their
  // schools straight away. A national/global actor must narrow first (geo or
  // search) so we never request a nationwide list.
  const isScopedActor = Boolean(
    actorScope?.school_ids?.length ||
      actorScope?.provinces?.length ||
      actorScope?.districts?.length ||
      actorScope?.sub_districts?.length ||
      actorScope?.own_only,
  );
  const trimmedSearch = schoolSearch.trim();
  const hasNarrowing = Boolean(
    province || district || subDistrict || trimmedSearch.length >= 2,
  );
  const schoolsEnabled = isScopedActor || hasNarrowing;

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
    schoolsEnabled,
    isLoading:
      locationsQuery.isLoading || (schoolsEnabled && schoolsQuery.isLoading),
    isError: locationsQuery.isError || schoolsQuery.isError,
  };
}
