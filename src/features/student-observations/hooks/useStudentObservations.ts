import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TeacherAccessGuestCredential } from "../../teacher-access/hooks/useTeacherAccess";
import { studentObservationsService } from "../api/student-observations.service";
import type {
  CreateFollowUpRequestInput,
  CreateHumanRiskReviewInput,
  CreateStudentObservationInput,
  HumanRiskReviewState,
  HomeVisitRequestReportFilters,
  ReviewFollowUpRequestInput,
  TeacherObservationReportFilters,
  TeacherWatchlistFilters,
} from "../types/student-observation.types";

const KEY = "student-observations";

function guestKey(cacheIdentity: string, studentTermId?: string) {
  return [KEY, "guest", cacheIdentity, studentTermId] as const;
}

function guestFollowUpKey(cacheIdentity: string, studentTermId?: string) {
  return [KEY, "guest-follow-ups", cacheIdentity, studentTermId] as const;
}

function managedKey(studentTermId: string, resource: string) {
  return [KEY, "managed", studentTermId, resource] as const;
}

export function useGuestObservationCatalog(
  credential: TeacherAccessGuestCredential | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [KEY, "guest-catalog", credential?.cacheIdentity ?? "pending"],
    queryFn: () =>
      studentObservationsService.getGuestCatalog(credential!.token),
    enabled: Boolean(enabled && credential?.token),
    retry: false,
    gcTime: 0,
  });
}

export function useGuestStudentObservations(
  credential: TeacherAccessGuestCredential | null,
  assignmentId?: number,
  studentTermId?: string,
) {
  return useQuery({
    queryKey: guestKey(credential?.cacheIdentity ?? "pending", studentTermId),
    queryFn: () =>
      studentObservationsService.listGuestObservations(credential!.token, {
        assignmentId: assignmentId!,
        studentTermId: studentTermId!,
      }),
    enabled: Boolean(credential?.token && assignmentId && studentTermId),
    retry: false,
    gcTime: 0,
  });
}

export function useCreateGuestStudentObservation(
  credential: TeacherAccessGuestCredential | null,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStudentObservationInput) =>
      studentObservationsService.createGuestObservation(
        credential!.token,
        input,
      ),
    gcTime: 0,
    onSuccess: async (observation) => {
      await client.invalidateQueries({
        queryKey: guestKey(
          credential!.cacheIdentity,
          observation.studentTermId,
        ),
      });
    },
  });
}

export function useGuestStudentFollowUps(
  credential: TeacherAccessGuestCredential | null,
  assignmentId?: number,
  studentTermId?: string,
) {
  return useQuery({
    queryKey: guestFollowUpKey(
      credential?.cacheIdentity ?? "pending",
      studentTermId,
    ),
    queryFn: () =>
      studentObservationsService.listGuestFollowUps(credential!.token, {
        assignmentId: assignmentId!,
        studentTermId: studentTermId!,
      }),
    enabled: Boolean(credential?.token && assignmentId && studentTermId),
    retry: false,
    gcTime: 0,
  });
}

export function useCreateGuestFollowUp(
  credential: TeacherAccessGuestCredential | null,
  studentTermId: string,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFollowUpRequestInput) =>
      studentObservationsService.createGuestFollowUp(
        credential!.token,
        studentTermId,
        input,
      ),
    gcTime: 0,
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: guestFollowUpKey(credential!.cacheIdentity, studentTermId),
      });
    },
  });
}

export function useManagedStudentObservations(studentTermId: string) {
  return useQuery({
    queryKey: managedKey(studentTermId, "observations"),
    queryFn: () =>
      studentObservationsService.listManagedObservations(studentTermId),
  });
}

export function useManagedObservationCatalog(enabled = true) {
  return useQuery({
    queryKey: [KEY, "managed-catalog"],
    queryFn: studentObservationsService.getManagedCatalog,
    enabled,
  });
}

export function useCreateManagedStudentObservation(studentTermId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateStudentObservationInput, "studentTermId">) =>
      studentObservationsService.createManagedObservation(studentTermId, input),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: managedKey(studentTermId, "observations"),
      });
      await client.invalidateQueries({ queryKey: [KEY, "teacher-reports"] });
    },
  });
}

export function useCreateManagedFollowUp(studentTermId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFollowUpRequestInput) =>
      studentObservationsService.createManagedFollowUp(studentTermId, input),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: managedKey(studentTermId, "follow-ups"),
      });
      await client.invalidateQueries({
        queryKey: [KEY, "home-visit-requests"],
      });
      await client.invalidateQueries({ queryKey: [KEY, "teacher-reports"] });
    },
  });
}

export function useTaskLinkObservationCatalog(
  token: string,
  sessionToken: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [KEY, "task-catalog", token],
    queryFn: () =>
      studentObservationsService.getTaskLinkCatalog(token, sessionToken),
    enabled: Boolean(enabled && token),
    retry: false,
    gcTime: 0,
  });
}

export function useTaskLinkStudentObservations(
  token: string,
  sessionToken: string | undefined,
  studentTermId?: string,
  timetableSlotId?: number,
) {
  return useQuery({
    queryKey: [KEY, "task", token, studentTermId, timetableSlotId],
    queryFn: () =>
      studentObservationsService.listTaskLinkObservations(
        token,
        { studentTermId: studentTermId!, timetableSlotId },
        sessionToken,
      ),
    enabled: Boolean(token && studentTermId),
    retry: false,
    gcTime: 0,
  });
}

export function useCreateTaskLinkStudentObservation(
  token: string,
  sessionToken: string | undefined,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStudentObservationInput) =>
      studentObservationsService.createTaskLinkObservation(
        token,
        input,
        sessionToken,
      ),
    gcTime: 0,
    onSuccess: async (observation) => {
      await client.invalidateQueries({
        queryKey: [KEY, "task", token, observation.studentTermId],
      });
    },
  });
}

export function useTeacherObservationReports(
  filters: TeacherObservationReportFilters,
) {
  return useQuery({
    queryKey: [KEY, "teacher-reports", filters],
    queryFn: () =>
      studentObservationsService.listTeacherObservationReports(filters),
  });
}

export function useTeacherObservationReport(observationId: string) {
  return useQuery({
    queryKey: [KEY, "teacher-report", observationId],
    queryFn: () =>
      studentObservationsService.getTeacherObservationReport(observationId),
    enabled: Boolean(observationId),
  });
}

export function useTeacherWatchlist(
  filters: TeacherWatchlistFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: [KEY, "teacher-watchlist", filters],
    queryFn: () => studentObservationsService.listTeacherWatchlist(filters),
    enabled,
  });
}

export function useHomeVisitRequests(filters: HomeVisitRequestReportFilters) {
  return useQuery({
    queryKey: [KEY, "home-visit-requests", filters],
    queryFn: () => studentObservationsService.listHomeVisitRequests(filters),
  });
}

export function useHomeVisitRequest(requestId: string) {
  return useQuery({
    queryKey: [KEY, "home-visit-request", requestId],
    queryFn: () => studentObservationsService.getHomeVisitRequest(requestId),
    enabled: Boolean(requestId),
  });
}

export function useHumanRiskReview(studentTermId: string) {
  return useQuery({
    queryKey: managedKey(studentTermId, "risk-review"),
    queryFn: () => studentObservationsService.getHumanRiskReview(studentTermId),
  });
}

export function useCreateHumanRiskReview(studentTermId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHumanRiskReviewInput) =>
      studentObservationsService.createHumanRiskReview(studentTermId, input),
    onSuccess: (review) => {
      client.setQueryData<HumanRiskReviewState>(
        managedKey(studentTermId, "risk-review"),
        {
          review,
          currentCalculatedAttendanceRisk: review.calculatedAttendanceRisk,
        },
      );
    },
  });
}

export function useManagedFollowUps(studentTermId: string) {
  return useQuery({
    queryKey: managedKey(studentTermId, "follow-ups"),
    queryFn: () =>
      studentObservationsService.listManagedFollowUps(studentTermId),
  });
}

export function useReviewFollowUp(studentTermId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      input,
    }: {
      requestId: string;
      input: ReviewFollowUpRequestInput;
    }) =>
      studentObservationsService.reviewFollowUp(
        studentTermId,
        requestId,
        input,
      ),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: managedKey(studentTermId, "follow-ups"),
      });
      await client.invalidateQueries({
        queryKey: [KEY, "home-visit-requests"],
      });
      await client.invalidateQueries({ queryKey: [KEY, "home-visit-request"] });
    },
  });
}

export function useObservationSummary(studentTermId: string) {
  return useQuery({
    queryKey: managedKey(studentTermId, "summary"),
    queryFn: () =>
      studentObservationsService.getObservationSummary(studentTermId),
    retry: false,
  });
}

export function useGenerateObservationSummary(studentTermId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (sourceObservationIds?: string[]) =>
      studentObservationsService.generateObservationSummary(
        studentTermId,
        sourceObservationIds,
      ),
    onSuccess: async (result) => {
      if (result.available) {
        await client.invalidateQueries({
          queryKey: managedKey(studentTermId, "summary"),
        });
      }
    },
  });
}

export function useReviewObservationSummary(studentTermId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      summaryId,
      decision,
      note,
    }: {
      summaryId: string;
      decision: "REVIEWED" | "REJECTED";
      note?: string;
    }) =>
      studentObservationsService.reviewObservationSummary(
        studentTermId,
        summaryId,
        { decision, note },
      ),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: managedKey(studentTermId, "summary"),
      });
    },
  });
}
