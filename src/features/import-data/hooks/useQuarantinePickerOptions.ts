import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ComboboxOption } from "../../../components/base";
import { toRoomOption } from "../../../lib/room-presentation";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import { studentStatusService } from "../../student-statuses/api/student-status.service";

interface QuarantinePickerParams {
  /** Only fetch while the fix dialog is open. */
  enabled: boolean;
  /** Grade label + school of the quarantined row, used to suggest known rooms. */
  gradeLabel?: string | null;
  schoolId?: number | null;
  roomEnabled?: boolean;
}

function statusOptionLabel(code: number, label: string): string {
  return `${code} - ${label.replace(/\s*\(ตัวอย่าง\)\s*$/u, "").trim() || label}`;
}

/**
 * Master-data options for the quarantine inline-fix dialog: grade levels,
 * student statuses (placeholder UNMAPPED-category statuses excluded — they are
 * not importable) and known rooms for the row's grade/school. School selection
 * uses the shared `useSchoolAreaFilter` cascade instead of a flat list.
 */
export function useQuarantinePickerOptions({
  enabled,
  gradeLabel,
  schoolId,
  roomEnabled = false,
}: QuarantinePickerParams) {
  const gradesQuery = useQuery({
    queryKey: ["quarantine-picker-grades"],
    queryFn: attendanceLookupService.getGradeLevels,
    staleTime: 5 * 60 * 1000,
    enabled,
  });

  const statusesQuery = useQuery({
    queryKey: ["quarantine-picker-statuses"],
    queryFn: () =>
      // limit must be one of the shared PAGE_SIZES (10/20/50); 50 covers the
      // whole status catalog.
      studentStatusService.list({
        page: 1,
        limit: 50,
        sortBy: "sortOrder",
        sortDirection: "asc",
      }),
    staleTime: 5 * 60 * 1000,
    enabled,
  });

  const roomsQuery = useQuery({
    queryKey: ["quarantine-picker-rooms", gradeLabel, schoolId],
    queryFn: () =>
      attendanceLookupService.getRooms(
        gradeLabel ?? "",
        schoolId ? String(schoolId) : undefined,
      ),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && roomEnabled && Boolean(gradeLabel),
  });

  const gradeOptions: ComboboxOption[] = useMemo(
    () =>
      (gradesQuery.data ?? []).map((grade) => ({
        value: String(grade.id),
        label: grade.label,
      })),
    [gradesQuery.data],
  );

  const statusOptions: ComboboxOption[] = useMemo(
    () =>
      (statusesQuery.data?.items ?? [])
        .filter((status) => status.isEnabled && status.category !== "UNMAPPED")
        .map((status) => ({
          value: String(status.code),
          label: statusOptionLabel(status.code, status.labelTh),
        })),
    [statusesQuery.data],
  );

  const roomOptions: ComboboxOption[] = useMemo(
    () =>
      (roomsQuery.data ?? []).map(toRoomOption),
    [roomsQuery.data],
  );

  return {
    gradeOptions,
    statusOptions,
    roomOptions,
    isLoading:
      gradesQuery.isLoading || statusesQuery.isLoading || roomsQuery.isLoading,
  };
}
