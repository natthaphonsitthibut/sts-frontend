import { useMutation, useQueryClient } from "@tanstack/react-query";
import { casesService } from "../api/cases.service";
import type { StudentReadSource } from "../../students/api/students.service";
import type { OpenCasePayload, OpenCaseResponse } from "../types/cases.types";

export function useOpenCase(source: StudentReadSource = "INTERNAL") {
  const queryClient = useQueryClient();

  return useMutation<OpenCaseResponse, Error, OpenCasePayload>({
    mutationFn: (payload) => casesService.openCase(payload, source),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["risk-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["student-cases"] }),
      ]);
    },
  });
}
