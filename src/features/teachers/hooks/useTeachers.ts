import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { PaginationMeta } from "../../../lib/pagination";
import { teachersService } from "../api/teachers.service";
import type {
  Teacher,
  TeacherProfile,
  TeacherCreatePayload,
  TeacherListQuery,
  TeacherSavePayload,
} from "../types/teachers.types";

export const TEACHERS_QUERY_KEY = "teachers";

const EMPTY_TEACHERS: Teacher[] = [];

interface UseTeachersResult {
  teachers: Teacher[];
  meta: PaginationMeta | undefined;
  isLoading: boolean;
  isError: boolean;
  dataUpdatedAt: number;
  refetch: () => void;
}

/** Passing `null` keeps the query idle — used while no school is selected yet. */
export function useTeachers(query: TeacherListQuery | null): UseTeachersResult {
  const result = useQuery({
    queryKey: [TEACHERS_QUERY_KEY, query],
    queryFn: () => teachersService.getTeachers(query!),
    enabled: Boolean(query),
    placeholderData: keepPreviousData,
  });

  return {
    teachers: result.data?.items ?? EMPTY_TEACHERS,
    meta: result.data?.meta,
    isLoading: result.isLoading,
    isError: result.isError,
    dataUpdatedAt: result.dataUpdatedAt,
    refetch: () => {
      void result.refetch();
    },
  };
}

export function useTeacherProfiles(query: TeacherListQuery | null) {
  const result = useQuery({
    queryKey: [TEACHERS_QUERY_KEY, "directory", query],
    queryFn: () => teachersService.getTeacherProfiles(query!),
    enabled: Boolean(query),
    placeholderData: keepPreviousData,
  });
  return {
    teachers: result.data?.items ?? ([] as TeacherProfile[]),
    meta: result.data?.meta,
    isLoading: result.isLoading,
    isError: result.isError,
    dataUpdatedAt: result.dataUpdatedAt,
    refetch: () => void result.refetch(),
  };
}

export function useTeacher(id: string | null) {
  return useQuery({
    queryKey: [TEACHERS_QUERY_KEY, "detail", id],
    queryFn: () => teachersService.getTeacher(id!),
    enabled: Boolean(id),
  });
}

export function useTeacherProfile(id: string | null) {
  return useQuery({
    queryKey: [TEACHERS_QUERY_KEY, "profile", id],
    queryFn: () => teachersService.getTeacherProfile(id!),
    enabled: Boolean(id),
  });
}

/**
 * The profile page saves the photo on its own — there is no surrounding form to
 * submit it with, so every teacher list/profile view is refreshed once storage
 * points at the new file.
 */
export function useUpdateTeacherPhoto(id: string | null) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { photo?: File; remove?: boolean }>({
    mutationFn: (input) => teachersService.updateTeacherPhoto(id!, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [TEACHERS_QUERY_KEY] });
    },
    throwOnError: false,
  });
}

interface SaveTeacherVariables {
  id: string | null;
  payload: TeacherCreatePayload;
  /** Chosen in the form but only uploadable once the teacher row exists. */
  photo?: File;
  removePhoto?: boolean;
}

/**
 * Creates or updates the teacher, then syncs the photo in the same mutation so
 * the form has a single pending/error state to render.
 */
export function useSaveTeacher() {
  const queryClient = useQueryClient();

  return useMutation<Teacher, Error, SaveTeacherVariables>({
    mutationFn: async ({ id, payload, photo, removePhoto }) => {
      const { schoolId, ...profile } = payload;
      const teacher = id
        ? await teachersService.updateTeacher(
            id,
            profile satisfies TeacherSavePayload,
          )
        : await teachersService.createTeacher({ ...profile, schoolId });
      if (photo || removePhoto) {
        await teachersService.updateTeacherPhoto(teacher.id, {
          photo,
          remove: removePhoto,
        });
      }
      return teacher;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [TEACHERS_QUERY_KEY] });
    },
  });
}

export function useDeactivateTeacher() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; note?: string }>({
    mutationFn: ({ id, note }) => teachersService.deactivateTeacher(id, note),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [TEACHERS_QUERY_KEY] });
    },
  });
}
