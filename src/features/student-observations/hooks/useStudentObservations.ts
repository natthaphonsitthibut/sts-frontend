import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TeacherAccessGuestCredential } from "../../teacher-access/hooks/useTeacherAccess";
import { studentObservationsService } from "../api/student-observations.service";
import type {
  CreateFollowUpRequestInput,
  CreateHumanRiskReviewInput,
  CreateStudentObservationInput,
  ReviewFollowUpRequestInput,
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
      client.setQueryData(managedKey(studentTermId, "risk-review"), review);
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
