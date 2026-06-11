import { useQuery } from "@tanstack/react-query";
import { attendanceService } from "../api/attendance.service";
import type { AttendanceClassSummary } from "../types/attendance.types";

export const ATTENDANCE_OVERVIEW_QUERY_KEY = "attendance-overview";

const EMPTY_SUMMARIES: AttendanceClassSummary[] = [];

interface UseAttendanceOverviewResult {
  summaries: AttendanceClassSummary[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useAttendanceOverview(
  date: string,
): UseAttendanceOverviewResult {
  const result = useQuery({
    queryKey: [ATTENDANCE_OVERVIEW_QUERY_KEY, date],
    queryFn: () => attendanceService.getDailyClassSummaries(date),
    enabled: Boolean(date),
  });

  return {
    summaries: result.data ?? EMPTY_SUMMARIES,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: () => {
      void result.refetch();
    },
  };
}
