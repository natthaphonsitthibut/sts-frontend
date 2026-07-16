import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
export function useSchoolAreaFilter(initial: {
  province?: string;
  district?: string;
  subDistrict?: string;
} = {}) {
  const [province, setProvinceState] = useState(initial.province ?? "");
  const [district, setDistrictState] = useState(initial.district ?? "");
  const [subDistrict, setSubDistrict] = useState(initial.subDistrict ?? "");
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
      locationsQuery.isLoading || (schoolsEnabled && schoolsQuery.isLoading),
    isError: locationsQuery.isError || schoolsQuery.isError,
    refetch: () => Promise.all([locationsQuery.refetch(), schoolsQuery.refetch()]),
  };
}
