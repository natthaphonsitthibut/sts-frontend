import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { useGlobalSchoolFilter } from "../../school-filter/hooks/useGlobalSchoolFilter";
import { attendanceLookupService } from "../api/attendance-lookup.service";
import { riskDashboardService } from "../api/risk-dashboard.service";

interface ReportScopeOptions {
  initialGrade?: string;
  initialRoom?: string;
  academicYear?: number;
  semester?: number;
}

/** Report choices follow accessible enrollment data at any geographic scope. */
export function useRiskReportScope(options: ReportScopeOptions) {
  const globalFilter = useGlobalSchoolFilter();
  const user = useAuthSessionStore((state) => state.user);
  const actorScope = user?.data_scope;
  const gradeLocked = actorScope?.grade_levels?.length === 1;
  const roomLocked = actorScope?.room_ids?.length === 1;
  const gradesQuery = useQuery({
    queryKey: ["scope-cascade-grade-levels"],
    queryFn: attendanceLookupService.getGradeLevels,
    enabled: gradeLocked,
  });
  const lockedGrade = gradeLocked
    ? (user?.data_scope_labels?.gradeLevels?.find(
        (grade) => String(grade.id) === String(actorScope?.grade_levels?.[0]),
      )?.label ??
      gradesQuery.data?.find(
        (grade) => String(grade.id) === String(actorScope?.grade_levels?.[0]),
      )?.label ??
      "")
    : "";
  const [gradeInput, setGradeInput] = useState(options.initialGrade ?? "");
  const [roomInput, setRoomInput] = useState(options.initialRoom ?? "");
  const area = {
    province: globalFilter.province || undefined,
    district: globalFilter.district || undefined,
    subDistrict: globalFilter.subDistrict || undefined,
    schoolId: globalFilter.schoolId || undefined,
  };
  const areaKey = JSON.stringify(area);
  const grade = gradeLocked ? lockedGrade : gradeInput;
  const filtersQuery = useQuery({
    queryKey: [
      "risk-report-filter-options",
      area,
      grade,
      options.academicYear,
      options.semester,
    ],
    queryFn: () =>
      riskDashboardService.getFilterOptions({
        ...area,
        grade: grade || undefined,
        academicYear: options.academicYear,
        semester: options.semester,
      }),
  });
  const grades = filtersQuery.data?.grades ?? [];
  const rooms = filtersQuery.data?.rooms ?? [];
  if (
    filtersQuery.isSuccess &&
    !gradeLocked &&
    gradeInput &&
    !grades.some((item) => item.value === gradeInput)
  ) {
    setGradeInput("");
    setRoomInput("");
  }
  if (
    filtersQuery.isSuccess &&
    !roomLocked &&
    roomInput &&
    !rooms.includes(roomInput)
  ) {
    setRoomInput("");
  }
  const room = roomLocked
    ? String(actorScope?.room_ids?.[0] ?? "")
    : rooms.includes(roomInput)
      ? roomInput
      : "";

  function setGrade(value: string): void {
    if (gradeLocked) return;
    setGradeInput(value);
    setRoomInput("");
  }
  function setRoom(value: string): void {
    if (!roomLocked) setRoomInput(value);
  }
  function reset(): void {
    setGradeInput("");
    setRoomInput("");
  }
  return {
    ...area,
    areaKey,
    schoolId: globalFilter.schoolId,
    grade,
    room,
    gradeLocked: Boolean(gradeLocked),
    roomLocked: Boolean(roomLocked),
    gradeLevels: grades.map((item) => ({ id: item.value, label: item.label })),
    rooms,
    terms: filtersQuery.data?.terms ?? [],
    filtersQuery,
    setGrade,
    setRoom,
    reset,
  };
}
