import { useQuery } from "@tanstack/react-query";
import { casesService } from "../api/cases.service";

export function useReferralAgencies(enabled = true) {
  return useQuery({
    queryKey: ["case-referral-agencies"],
    queryFn: casesService.getReferralAgencies,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
