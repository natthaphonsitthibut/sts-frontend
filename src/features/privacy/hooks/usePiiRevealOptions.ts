import { useQuery } from "@tanstack/react-query";
import { privacyService } from "../api/privacy.service";

export function usePiiRevealOptions() {
  const query = useQuery({
    queryKey: ["pii", "reveal-options"],
    queryFn: privacyService.getRevealReasonOptions,
    staleTime: 30 * 60 * 1000,
  });
  return {
    ...query,
    options: query.data ?? [],
  };
}
