import { useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceService } from "../api/attendance.service";
import type {
  AttendanceSaveRecord,
  AttendanceSaveResponse,
} from "../types/attendance.types";
import { ATTENDANCE_OVERVIEW_QUERY_KEY } from "./useAttendanceOverview";

export function useSubmitAttendance() {
  const queryClient = useQueryClient();

  return useMutation<AttendanceSaveResponse, Error, AttendanceSaveRecord[]>({
    mutationFn: (records) => attendanceService.saveAttendance(records),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [ATTENDANCE_OVERVIEW_QUERY_KEY],
      });
    },
  });
}
