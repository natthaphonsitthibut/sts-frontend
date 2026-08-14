import { useMutation, useQueryClient } from "@tanstack/react-query";
import { casesService } from "../api/cases.service";
import type { OpenCasePayload, OpenCaseResponse } from "../types/cases.types";

export function useOpenCase() {
  const queryClient = useQueryClient();

  return useMutation<OpenCaseResponse, Error, OpenCasePayload>({
    mutationFn: casesService.openCase,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["risk-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["student-cases"] }),
      ]);
    },
  });
}
