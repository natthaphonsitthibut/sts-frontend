import { isAxiosError } from "axios";
import { apiClient } from "../../../lib/api-client";
import type { TeacherLinkCredential } from "../../teacher-access/store/teacher-link-session.store";
import type {
  CreateFollowUpRequestInput,
  CreateHumanRiskReviewInput,
  CreateStudentObservationInput,
  GenerateObservationSummaryResult,
  HomeVisitRequestReport,
  HomeVisitRequestReportFilters,
  HumanRiskReview,
  HumanRiskReviewState,
  ObservationCatalog,
  ObservationSummaryResponse,
  PaginationMeta,
  ReviewFollowUpRequestInput,
  StudentFollowUpRequest,
  StudentObservation,
  StudentObservationSummary,
  TeacherCommentReport,
  TeacherObservationReport,
  TeacherObservationReportFilters,
  TeacherWatchlistFilters,
  TeacherWatchlistRow,
} from "../types/student-observation.types";

const TOKEN_HEADER = "x-teacher-access-token";
const SESSION_HEADER = "x-teacher-access-session";

/**
 * Teacher-link requests carry the link token plus, once the teacher has passed
 * the emailed OTP, the session that proves it. Both travel as headers so the
 * token never lands in a URL or a log line.
 */
function guestHeaders(credential: TeacherLinkCredential): Record<string, string> {
  return credential.sessionToken
    ? { [TOKEN_HEADER]: credential.token, [SESSION_HEADER]: credential.sessionToken }
    : { [TOKEN_HEADER]: credential.token };
}

interface DataEnvelope<T> {
  data: T;
}

interface PaginatedEnvelope<T> extends DataEnvelope<T[]> {
  meta: PaginationMeta;
}

async function runGuestRequest<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch {
    // Axios errors retain request headers. Replace them so bearer tokens never
    // survive in query/mutation error state or get rendered by a form alert.
    throw new Error("Teacher observation request failed");
  }
}

async function getGuestCatalog(credential: TeacherLinkCredential): Promise<ObservationCatalog> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<DataEnvelope<ObservationCatalog>>(
      "/teacher-access/observations/catalog",
      { headers: guestHeaders(credential) },
    );
    return response.data.data;
  });
}

async function listGuestObservations(
  credential: TeacherLinkCredential,
  input: { assignmentId: number; studentTermId: string },
): Promise<PaginatedEnvelope<StudentObservation>> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<PaginatedEnvelope<StudentObservation>>(
      "/teacher-access/observations",
      {
        headers: guestHeaders(credential),
        params: { ...input, page: 1, limit: 50 },
      },
    );
    return response.data;
  });
}

async function createGuestObservation(
  credential: TeacherLinkCredential,
  input: CreateStudentObservationInput,
): Promise<StudentObservation> {
  return runGuestRequest(async () => {
    const response = await apiClient.post<DataEnvelope<StudentObservation>>(
      "/teacher-access/observations",
      input,
      { headers: guestHeaders(credential) },
    );
    return response.data.data;
  });
}

async function listGuestFollowUps(
  credential: TeacherLinkCredential,
  input: { assignmentId: number; studentTermId: string },
): Promise<PaginatedEnvelope<StudentFollowUpRequest>> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<
      PaginatedEnvelope<StudentFollowUpRequest>
    >("/teacher-access/follow-up-requests", {
      headers: guestHeaders(credential),
      params: { ...input, page: 1, limit: 50 },
    });
    return response.data;
  });
}

async function createGuestFollowUp(
  credential: TeacherLinkCredential,
  studentTermId: string,
  input: CreateFollowUpRequestInput,
): Promise<{ data: StudentFollowUpRequest; meta: { created: boolean } }> {
  return runGuestRequest(async () => {
    const response = await apiClient.post<{
      data: StudentFollowUpRequest;
      meta: { created: boolean };
    }>(
      "/teacher-access/follow-up-requests",
      { studentTermId, ...input },
      { headers: guestHeaders(credential) },
    );
    return response.data;
  });
}

async function listTeacherComments(query: {
  page?: number;
  limit?: number;
  searchTerm?: string;
}): Promise<PaginatedEnvelope<TeacherCommentReport>> {
  const response = await apiClient.get<PaginatedEnvelope<TeacherCommentReport>>(
    "/student-risk-report/teacher-comments",
    { params: query },
  );
  return response.data;
}

async function listManagedObservations(
  studentTermId: string,
): Promise<PaginatedEnvelope<StudentObservation>> {
  const response = await apiClient.get<PaginatedEnvelope<StudentObservation>>(
    `/students/${studentTermId}/observations`,
    { params: { page: 1, limit: 50 } },
  );
  return response.data;
}

async function getManagedCatalog(): Promise<ObservationCatalog> {
  const response = await apiClient.get<DataEnvelope<ObservationCatalog>>(
    "/student-observations/catalog",
  );
  return response.data.data;
}

async function createManagedObservation(
  studentTermId: string,
  input: Omit<CreateStudentObservationInput, "studentTermId">,
): Promise<StudentObservation> {
  const response = await apiClient.post<DataEnvelope<StudentObservation>>(
    `/students/${studentTermId}/observations`,
    input,
  );
  return response.data.data;
}

function taskLinkHeaders(sessionToken?: string) {
  return sessionToken ? { "x-magic-session": sessionToken } : undefined;
}

async function getTaskLinkCatalog(
  token: string,
  sessionToken?: string,
): Promise<ObservationCatalog> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<DataEnvelope<ObservationCatalog>>(
      `/tasks/${encodeURIComponent(token)}/observations/catalog`,
      { headers: taskLinkHeaders(sessionToken) },
    );
    return response.data.data;
  });
}

async function listTaskLinkObservations(
  token: string,
  input: { studentTermId: string; timetableSlotId?: number },
  sessionToken?: string,
): Promise<PaginatedEnvelope<StudentObservation>> {
  return runGuestRequest(async () => {
    const response = await apiClient.get<PaginatedEnvelope<StudentObservation>>(
      `/tasks/${encodeURIComponent(token)}/observations`,
      {
        headers: taskLinkHeaders(sessionToken),
        params: { ...input, page: 1, limit: 50 },
      },
    );
    return response.data;
  });
}

async function createTaskLinkObservation(
  token: string,
  input: CreateStudentObservationInput,
  sessionToken?: string,
): Promise<StudentObservation> {
  return runGuestRequest(async () => {
    const response = await apiClient.post<DataEnvelope<StudentObservation>>(
      `/tasks/${encodeURIComponent(token)}/observations`,
      input,
      { headers: taskLinkHeaders(sessionToken) },
    );
    return response.data.data;
  });
}

async function createManagedFollowUp(
  studentTermId: string,
  input: CreateFollowUpRequestInput,
): Promise<{ data: StudentFollowUpRequest; meta: { created: boolean } }> {
  const response = await apiClient.post<{
    data: StudentFollowUpRequest;
    meta: { created: boolean };
  }>(`/students/${studentTermId}/follow-up-requests`, input);
  return response.data;
}

async function listTeacherObservationReports(
  filters: TeacherObservationReportFilters,
): Promise<PaginatedEnvelope<TeacherObservationReport>> {
  const response = await apiClient.get<
    PaginatedEnvelope<TeacherObservationReport>
  >("/student-risk-report/teacher-reports", { params: filters });
  return response.data;
}

async function getTeacherObservationReport(
  observationId: string,
): Promise<TeacherObservationReport> {
  const response = await apiClient.get<DataEnvelope<TeacherObservationReport>>(
    `/student-risk-report/teacher-reports/${observationId}`,
  );
  return response.data.data;
}

async function listTeacherWatchlist(
  filters: TeacherWatchlistFilters,
): Promise<PaginatedEnvelope<TeacherWatchlistRow>> {
  const response = await apiClient.get<PaginatedEnvelope<TeacherWatchlistRow>>(
    "/student-risk-report/teacher-watchlist",
    { params: filters },
  );
  return response.data;
}

async function listHomeVisitRequests(
  filters: HomeVisitRequestReportFilters,
): Promise<PaginatedEnvelope<HomeVisitRequestReport>> {
  const response = await apiClient.get<
    PaginatedEnvelope<HomeVisitRequestReport>
  >("/student-risk-report/home-visit-requests", { params: filters });
  return response.data;
}

async function getHomeVisitRequest(
  requestId: string,
): Promise<HomeVisitRequestReport> {
  const response = await apiClient.get<DataEnvelope<HomeVisitRequestReport>>(
    `/student-risk-report/home-visit-requests/${requestId}`,
  );
  return response.data.data;
}

async function getHumanRiskReview(
  studentTermId: string,
): Promise<HumanRiskReviewState> {
  const response = await apiClient.get<
    DataEnvelope<HumanRiskReview | null> & {
      meta: { currentCalculatedAttendanceRisk: string };
    }
  >(`/students/${studentTermId}/risk-review`);
  return {
    review: response.data.data,
    currentCalculatedAttendanceRisk:
      response.data.meta.currentCalculatedAttendanceRisk,
  };
}

async function createHumanRiskReview(
  studentTermId: string,
  input: CreateHumanRiskReviewInput,
): Promise<HumanRiskReview> {
  const response = await apiClient.post<DataEnvelope<HumanRiskReview>>(
    `/students/${studentTermId}/risk-review`,
    input,
  );
  return response.data.data;
}

async function listManagedFollowUps(
  studentTermId: string,
): Promise<PaginatedEnvelope<StudentFollowUpRequest>> {
  const response = await apiClient.get<
    PaginatedEnvelope<StudentFollowUpRequest>
  >(`/students/${studentTermId}/follow-up-requests`, {
    params: { page: 1, limit: 50 },
  });
  return response.data;
}

async function reviewFollowUp(
  studentTermId: string,
  requestId: string,
  input: ReviewFollowUpRequestInput,
): Promise<StudentFollowUpRequest> {
  const response = await apiClient.patch<DataEnvelope<StudentFollowUpRequest>>(
    `/students/${studentTermId}/follow-up-requests/${requestId}`,
    input,
  );
  return response.data.data;
}

async function getObservationSummary(
  studentTermId: string,
): Promise<ObservationSummaryResponse> {
  const response = await apiClient.get<ObservationSummaryResponse>(
    `/students/${studentTermId}/observation-summary`,
  );
  return response.data;
}

async function generateObservationSummary(
  studentTermId: string,
  sourceObservationIds?: string[],
): Promise<GenerateObservationSummaryResult> {
  try {
    const response = await apiClient.post<{
      data: StudentObservationSummary;
      reused: boolean;
    }>(`/students/${studentTermId}/observation-summary`, {
      sourceObservationIds,
    });
    return {
      available: true,
      data: response.data.data,
      reused: response.data.reused,
    };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 503) {
      return { available: false };
    }
    throw error;
  }
}

async function reviewObservationSummary(
  studentTermId: string,
  summaryId: string,
  input: { decision: "REVIEWED" | "REJECTED"; note?: string },
): Promise<StudentObservationSummary> {
  const response = await apiClient.patch<
    DataEnvelope<StudentObservationSummary>
  >(
    `/students/${studentTermId}/observation-summary/${summaryId}/review`,
    input,
  );
  return response.data.data;
}

export const studentObservationsService = {
  getGuestCatalog,
  listGuestObservations,
  createGuestObservation,
  listGuestFollowUps,
  createGuestFollowUp,
  getManagedCatalog,
  createManagedObservation,
  createManagedFollowUp,
  getTaskLinkCatalog,
  listTaskLinkObservations,
  createTaskLinkObservation,
  listTeacherObservationReports,
  getTeacherObservationReport,
  listTeacherWatchlist,
  listHomeVisitRequests,
  getHomeVisitRequest,
  listManagedObservations,
  listTeacherComments,
  getHumanRiskReview,
  createHumanRiskReview,
  listManagedFollowUps,
  reviewFollowUp,
  getObservationSummary,
  generateObservationSummary,
  reviewObservationSummary,
};
