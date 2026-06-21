import { useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceService } from "../api/attendance.service";
import type {
  AttendanceSaveRecord,
  AttendanceSaveResponse,
} from "../types/attendance.types";

export function useSubmitAttendance() {
  const queryClient = useQueryClient();

  return useMutation<AttendanceSaveResponse, Error, AttendanceSaveRecord[]>({
    mutationFn: (records) => attendanceService.saveAttendance(records),
    onSuccess: () => {
      // Refresh the history view so a just-saved class reflects immediately.
      void queryClient.invalidateQueries({
        queryKey: ["attendance-checkin-history"],
      });
    },
  });
}
