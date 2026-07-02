import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { studentStatusService } from "../api/student-status.service";
import type {
  StudentStatusListQuery,
  StudentStatusPayload,
} from "../types/student-status.types";

export const STUDENT_STATUSES_QUERY_KEY = "student-statuses";

export function useStudentStatuses(query: StudentStatusListQuery) {
  return useQuery({
    queryKey: [STUDENT_STATUSES_QUERY_KEY, query],
    queryFn: () => studentStatusService.list(query),
  });
}

export function useSaveStudentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      code,
      payload,
      isEdit,
    }: {
      code: number;
      payload: StudentStatusPayload;
      isEdit: boolean;
    }) =>
      isEdit
        ? studentStatusService.update(code, {
            labelTh: payload.labelTh,
            category: payload.category,
            isActiveForLogin: payload.isActiveForLogin,
            isTerminal: payload.isTerminal,
            requiresFollowup: payload.requiresFollowup,
            isEnabled: payload.isEnabled,
            sortOrder: payload.sortOrder,
            sourceSystem: payload.sourceSystem,
          })
        : studentStatusService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [STUDENT_STATUSES_QUERY_KEY] });
    },
  });
}

export function useDisableStudentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: studentStatusService.disable,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [STUDENT_STATUSES_QUERY_KEY] });
    },
  });
}
