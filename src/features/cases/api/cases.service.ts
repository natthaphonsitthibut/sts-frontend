import { apiClient } from "../../../lib/api-client";
import type { StudentReadSource } from "../../students/api/students.service";
import type {
  CancelCaseAssignmentPayload,
  CancelCaseAssignmentResponse,
  CaseDetailResponse,
  CaseTrackingOptions,
  CaseReviewPayload,
  CaseReviewResponse,
  OpenCasePayload,
  OpenCaseResponse,
  ReferralAgencyOption,
} from "../types/cases.types";

interface CasesService {
  getCase: (caseId: number) => Promise<CaseDetailResponse>;
  openCase: (
    payload: OpenCasePayload,
    source?: StudentReadSource,
  ) => Promise<OpenCaseResponse>;
  /**
   * The backend has no raw "set status" endpoint — a case's status is driven
   * server-side by a review action plus an optional
   * note, via POST /cases/:id/review through apiClient.
   */
  reviewCase: (
    caseId: number,
    payload: CaseReviewPayload,
  ) => Promise<CaseReviewResponse>;
  getTrackingOptions: () => Promise<CaseTrackingOptions>;
  getReferralAgencies: () => Promise<ReferralAgencyOption[]>;
  /** Withdraws the assignment the case is waiting on; the case returns to รอมอบหมาย. */
  cancelAssignment: (
    caseId: number,
    payload: CancelCaseAssignmentPayload,
  ) => Promise<CancelCaseAssignmentResponse>;
}

async function getCase(caseId: number): Promise<CaseDetailResponse> {
  const response = await apiClient.get<CaseDetailResponse>(`/cases/${caseId}`);
  return response.data;
}

async function openCase(
  payload: OpenCasePayload,
  source: StudentReadSource = "INTERNAL",
): Promise<OpenCaseResponse> {
  // A classroom link has no account to check `dashboard` against, so it opens
  // the case through its own namespace, where the link's classroom is the
  // boundary and the case records the teacher who signed in.
  const response =
    source === "INTERNAL"
      ? await apiClient.post<OpenCaseResponse>("/cases", payload)
      : await apiClient.post<OpenCaseResponse>(
          `/classroom/students/${encodeURIComponent(payload.student_id)}/cases`,
          { reason: payload.reason },
        );
  return response.data;
}

async function reviewCase(
  caseId: number,
  payload: CaseReviewPayload,
): Promise<CaseReviewResponse> {
  const response = await apiClient.post<CaseReviewResponse>(
    `/cases/${caseId}/review`,
    payload,
  );
  return response.data;
}

async function cancelAssignment(
  caseId: number,
  payload: CancelCaseAssignmentPayload,
): Promise<CancelCaseAssignmentResponse> {
  const response = await apiClient.post<CancelCaseAssignmentResponse>(
    `/cases/${caseId}/cancel-assignment`,
    payload,
  );
  return response.data;
}

async function getTrackingOptions(): Promise<CaseTrackingOptions> {
  const response = await apiClient.get<CaseTrackingOptions>(
    "/public/case-tracking-options",
  );
  return response.data;
}

async function getReferralAgencies(): Promise<ReferralAgencyOption[]> {
  const response = await apiClient.get<{
    success: true;
    data: ReferralAgencyOption[];
  }>("/cases/referral-agencies");
  return response.data.data;
}

export const casesService: CasesService = {
  getCase,
  getReferralAgencies,
  openCase,
  reviewCase,
  getTrackingOptions,
  cancelAssignment,
};
