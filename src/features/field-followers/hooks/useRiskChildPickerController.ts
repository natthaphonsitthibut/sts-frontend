import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { studentsService } from "../../students/api/students.service";
import type { StudentListQuery } from "../../students/types/students.types";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";

const MAX_RESULTS = 30;

export function useRiskChildPickerController() {
  const scope = useScopeCascade({ lockToActorScope: true });
  const area = useSchoolAreaFilter();
  const [search, setSearch] = useState("");
  const [riskTier, setRiskTier] = useState<
    NonNullable<StudentListQuery["riskTier"]> | ""
  >("AT_RISK");

  const term = useDebouncedValue(search.trim(), 350);
  const studentsQuery = useQuery({
    queryKey: [
      "risk-child-picker",
      area.province,
      area.district,
      area.subDistrict,
      scope.schoolId,
      scope.grade,
      scope.room,
      term,
      riskTier,
    ],
    queryFn: () =>
      studentsService.getStudents({
        province: area.province || undefined,
        district: area.district || undefined,
        subDistrict: area.subDistrict || undefined,
        schoolId: scope.schoolId || undefined,
        grade: scope.grade || undefined,
        room: scope.room || undefined,
        searchTerm: term || undefined,
        riskTier: riskTier || undefined,
        limit: 50,
      }),
  });

  const results = useMemo(
    () => (studentsQuery.data?.items ?? []).slice(0, MAX_RESULTS),
    [studentsQuery.data],
  );

  function clearFilters(): void {
    area.reset();
    scope.reset();
    setSearch("");
    setRiskTier("AT_RISK");
  }

  return {
    area,
    scope,
    search,
    setSearch,
    riskTier,
    setRiskTier,
    studentsQuery,
    results,
    clearFilters,
    dataUpdatedAt: Math.max(
      area.dataUpdatedAt,
      scope.dataUpdatedAt,
      studentsQuery.dataUpdatedAt,
    ),
    refetch: () => Promise.all([
      area.refetch(),
      scope.refetch(),
      studentsQuery.refetch(),
    ]),
  };
}

export type RiskChildPickerController = ReturnType<typeof useRiskChildPickerController>;
