import { useQuery } from "@tanstack/react-query";
import { casesService } from "../api/cases.service";

export const CASE_TRACKING_OPTIONS_QUERY_KEY = "case-tracking-options";

export function useCaseTrackingOptions() {
  return useQuery({
    queryKey: [CASE_TRACKING_OPTIONS_QUERY_KEY],
    queryFn: casesService.getTrackingOptions,
    staleTime: 5 * 60 * 1000,
  });
}
