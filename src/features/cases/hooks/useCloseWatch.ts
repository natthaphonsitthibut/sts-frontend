import { useMutation, useQueryClient } from "@tanstack/react-query";
import { casesService } from "../api/cases.service";
import type {
  CloseWatchPayload,
  CloseWatchResponse,
} from "../types/cases.types";

export function useCloseWatch() {
  const queryClient = useQueryClient();

  return useMutation<CloseWatchResponse, Error, CloseWatchPayload>({
    mutationFn: (payload) => casesService.closeWatch(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["risk-dashboard"] });
    },
  });
}
