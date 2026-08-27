import { useQuery } from "@tanstack/react-query";
import type { StudentReadSource } from "../../students/api/students.service";
import { privacyService } from "../api/privacy.service";

export function usePiiRevealOptions(source: StudentReadSource = "INTERNAL") {
  const query = useQuery({
    queryKey: ["pii", "reveal-options", source],
    queryFn: () => privacyService.getRevealReasonOptions(source),
    staleTime: 30 * 60 * 1000,
  });
  return {
    ...query,
    options: query.data ?? [],
  };
}
