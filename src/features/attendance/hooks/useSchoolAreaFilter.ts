import { useMemo, useState } from "react";
import type { SchoolOption } from "../../tasks/api/attendance-lookup.service";

function unique(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  ).sort();
}

/**
 * Province → district → sub-district narrowing for a (potentially huge) school
 * list. Shared so every "pick a school" flow (home-visit student picker, the
 * check-in link form, …) filters schools the same way before the school combobox.
 * Selecting a level resets the levels below it.
 */
export function useSchoolAreaFilter(schools: SchoolOption[]) {
  const [province, setProvinceState] = useState("");
  const [district, setDistrictState] = useState("");
  const [subDistrict, setSubDistrict] = useState("");

  const provinces = useMemo(() => unique(schools.map((s) => s.province)), [schools]);
  const districts = useMemo(
    () =>
      unique(
        schools.filter((s) => !province || s.province === province).map((s) => s.district),
      ),
    [schools, province],
  );
  const subDistricts = useMemo(
    () =>
      unique(
        schools
          .filter((s) => !province || s.province === province)
          .filter((s) => !district || s.district === district)
          .map((s) => s.sub_district),
      ),
    [schools, province, district],
  );
  const filteredSchools = useMemo(
    () =>
      schools
        .filter((s) => !province || s.province === province)
        .filter((s) => !district || s.district === district)
        .filter((s) => !subDistrict || s.sub_district === subDistrict),
    [schools, province, district, subDistrict],
  );

  function setProvince(value: string): void {
    setProvinceState(value);
    setDistrictState("");
    setSubDistrict("");
  }

  function setDistrict(value: string): void {
    setDistrictState(value);
    setSubDistrict("");
  }

  return {
    province,
    district,
    subDistrict,
    provinces,
    districts,
    subDistricts,
    filteredSchools,
    setProvince,
    setDistrict,
    setSubDistrict,
  };
}
