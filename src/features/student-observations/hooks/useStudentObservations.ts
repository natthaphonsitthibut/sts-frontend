import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TeacherLinkCredential } from "../../teacher-access/store/teacher-link-session.store";
import { studentObservationsService } from "../api/student-observations.service";
import type {
  CreateHumanRiskReviewInput,
  CreateStudentObservationInput,
  HumanRiskReviewState,
  TeacherObservationReportFilters,
  TeacherWatchlistFilters,
} from "../types/student-observation.types";

const KEY = "student-observations";

/** Cache namespace per link, without ever putting the raw token in a key. */
function guestIdentity(credential: TeacherLinkCredential): string {
  return credential.token ? credential.token.slice(-8) : "pending";
}

function guestKey(cacheIdentity: string, studentTermId?: string) {
  return [KEY, "guest", cacheIdentity, studentTermId] as const;
}

function managedKey(studentTermId: string, resource: string) {
  return [KEY, "managed", studentTermId, resource] as const;
}

export function useGuestObservationCatalog(
  credential: TeacherLinkCredential,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [KEY, "guest-catalog", guestIdentity(credential)],
    queryFn: () =>
      studentObservationsService.getGuestCatalog(credential),
    enabled: Boolean(enabled && credential.token),
    retry: false,
    gcTime: 0,
  });
}

export function useGuestStudentObservations(
  credential: TeacherLinkCredential,
  assignmentId?: number,
  studentTermId?: string,
) {
  return useQuery({
    queryKey: guestKey(guestIdentity(credential), studentTermId),
    queryFn: () =>
      studentObservationsService.listGuestObservations(credential, {
        assignmentId: assignmentId!,
        studentTermId: studentTermId!,
      }),
    enabled: Boolean(credential.token && assignmentId && studentTermId),
    retry: false,
    gcTime: 0,
  });
}

export function useCreateGuestStudentObservation(
  credential: TeacherLinkCredential,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStudentObservationInput) =>
      studentObservationsService.createGuestObservation(
        credential,
        input,
      ),
    gcTime: 0,
    onSuccess: async (observation) => {
      await client.invalidateQueries({
        queryKey: guestKey(
          guestIdentity(credential),
          observation.studentTermId,
        ),
      });
    },
  });
}

export function useTeacherComments(query: {
  page?: number;
  limit?: number;
  searchTerm?: string;
}) {
  return useQuery({
    queryKey: [KEY, "teacher-comments", query],
    queryFn: () => studentObservationsService.listTeacherComments(query),
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
