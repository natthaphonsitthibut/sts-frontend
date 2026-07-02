import { useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsService } from "../api/students.service";
import type { StudentUpdatePayload } from "../types/students.types";

export function useUpdateStudent(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StudentUpdatePayload) => studentsService.updateStudent(studentId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["student", studentId] });
      await queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
