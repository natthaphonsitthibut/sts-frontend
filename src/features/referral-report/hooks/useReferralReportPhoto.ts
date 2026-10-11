import { useQuery } from "@tanstack/react-query";
import { useBlobObjectUrl } from "../../../hooks/useBlobObjectUrl";
import { referralReportService } from "../api/referral-report.service";

/** The student's photo on the agency's page, behind the link's own session. */
export function useReferralReportPhoto(
  photoUrl: string | null | undefined,
  sessionToken: string | null | undefined,
): string | null {
  const photoQuery = useQuery({
    queryKey: ["referral-report-photo", photoUrl ?? null],
    queryFn: () =>
      referralReportService.getStudentPhoto(
        photoUrl ?? "",
        sessionToken || undefined,
      ),
    enabled: Boolean(photoUrl),
    retry: false,
    staleTime: Infinity,
  });
  return useBlobObjectUrl(photoQuery.data);
}
