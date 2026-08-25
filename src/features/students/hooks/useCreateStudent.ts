import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { studentsService } from "../api/students.service";
import type { StudentCreatePayload } from "../types/students.types";

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StudentCreatePayload) =>
      studentsService.createStudent(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useStudentManagementOptions() {
  return useQuery({
    queryKey: ["student-management-options"],
    queryFn: studentsService.getManagementOptions,
  });
}
