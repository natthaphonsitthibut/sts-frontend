import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolStructureService } from "../api/school-structure.service";
import { importService } from "../../import-data/api/import.service";
import type {
  CreateClassroomInput,
  PaginatedClassroomRoster,
  PaginatedSchoolClassrooms,
  UpdateClassroomInput,
  UpdateClassroomPresentationInput,
} from "../types/school-structure.types";
import type {
  ClassroomRosterListParams,
  ClassroomAttendanceHistoryParams,
  SchoolClassroomListParams,
  SchoolTeacherListParams,
} from "../api/school-structure.service";

const KEY = "school-structure";

export function useScopedSchools() {
  return useQuery({
    queryKey: [KEY, "schools"],
    queryFn: schoolStructureService.listSchools,
  });
}

export function useSchoolClassrooms(params: SchoolClassroomListParams | null) {
  return useQuery({
    queryKey: [KEY, "classrooms", params],
    queryFn: () => schoolStructureService.listClassrooms(params!),
    enabled: Boolean(params),
  });
}

export function useSchoolClassroom(classroomId: string | null) {
  return useQuery({
    queryKey: [KEY, "classroom", classroomId],
    queryFn: () => schoolStructureService.getClassroom(classroomId!),
    enabled: Boolean(classroomId),
  });
}

export function useSchoolClassroomOptions(
  params: {
    schoolId: number;
    termId?: number;
    gradeLevelId?: number;
  } | null,
) {
  return useQuery({
    queryKey: [KEY, "classroom-options", params],
    queryFn: () => schoolStructureService.listClassroomOptions(params!),
    enabled: Boolean(params),
  });
}

export function useCreateSchoolClassroom() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClassroomInput) =>
      schoolStructureService.createClassroom(input),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: [KEY, "classrooms"] }),
        client.invalidateQueries({ queryKey: [KEY, "classroom-options"] }),
      ]);
    },
  });
}

export function useUpdateSchoolClassroom() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateClassroomInput) =>
      schoolStructureService.updateClassroom(input),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: [KEY, "classrooms"] }),
        client.invalidateQueries({ queryKey: [KEY, "classroom-options"] }),
        client.invalidateQueries({ queryKey: [KEY, "roster"] }),
      ]);
    },
  });
}

export function useDeleteSchoolClassroom() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (classroomId: string) =>
      schoolStructureService.deleteClassroom(classroomId),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: [KEY, "classrooms"] }),
        client.invalidateQueries({ queryKey: [KEY, "classroom-options"] }),
      ]);
    },
  });
}

export function useSetClassroomFavorite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: schoolStructureService.setClassroomFavorite,
    onMutate: async (input) => {
      const queryKey = [KEY, "classrooms"] as const;
      await client.cancelQueries({ queryKey });
      const snapshots = client.getQueriesData<PaginatedSchoolClassrooms>({
        queryKey,
      });
      client.setQueriesData<PaginatedSchoolClassrooms>(
        { queryKey },
        (current) => {
          if (!current) return current;
          const target = current.data.find(
            (item) => item.id === input.classroomId,
          );
          if (!target) return current;
          const updatedTarget = { ...target, isFavorite: input.isFavorite };
          const remaining = current.data.filter(
            (item) => item.id !== input.classroomId,
          );
          const data = input.isFavorite
            ? [updatedTarget, ...remaining]
            : [
                ...remaining.filter((item) => item.isFavorite),
                updatedTarget,
                ...remaining.filter((item) => !item.isFavorite),
              ];
          return { ...current, data };
        },
      );
      return { snapshots };
    },
    onError: (_error, _input, context) => {
      context?.snapshots.forEach(([queryKey, data]) =>
        client.setQueryData(queryKey, data),
      );
    },
    onSettled: async () =>
      client.invalidateQueries({ queryKey: [KEY, "classrooms"] }),
    meta: { suppressSuccessToast: true },
  });
}

export function useUpdateClassroomPresentation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateClassroomPresentationInput) =>
      schoolStructureService.updateClassroomPresentation(input),
    onSuccess: async (updated) => {
      client.setQueriesData<PaginatedSchoolClassrooms>(
        { queryKey: [KEY, "classrooms"] },
        (current) =>
          current
            ? {
                ...current,
                data: current.data.map((item) =>
                  item.id === updated.id
                    ? {
                        ...item,
                        cardCoverColor: updated.cardCoverColor,
                        coverImageUrl: updated.coverImageUrl,
                        coverImagePositionX: updated.coverImagePositionX,
                        coverImagePositionY: updated.coverImagePositionY,
                        coverImageScale: updated.coverImageScale,
                      }
                    : item,
                ),
              }
            : current,
      );
      await client.invalidateQueries({ queryKey: [KEY, "classrooms"] });
    },
    meta: { successMessage: "บันทึกการปรับแต่งห้องเรียนแล้ว" },
  });
}

export function useSchoolTeachers(params: SchoolTeacherListParams | null) {
  return useQuery({
    queryKey: [KEY, "teachers", params],
    queryFn: () => schoolStructureService.listTeachers(params!),
    enabled: Boolean(params),
  });
}

export function useSchoolTeacherOptions(schoolId?: number) {
  return useQuery({
    queryKey: [KEY, "teacher-options", schoolId],
    queryFn: () => schoolStructureService.listTeacherOptions(schoolId!),
    enabled: Boolean(schoolId),
  });
}

export function useClassroomAssignments(classroomId?: number) {
  return useQuery({
    queryKey: [KEY, "assignments", classroomId],
    queryFn: () => schoolStructureService.listAssignments(classroomId!),
    enabled: Boolean(classroomId),
  });
}

export function useCreateHomeroomAssignment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: schoolStructureService.createHomeroomAssignment,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: [KEY, "assignments"] }),
        client.invalidateQueries({ queryKey: [KEY, "classrooms"] }),
        client.invalidateQueries({ queryKey: [KEY, "teachers"] }),
      ]);
    },
  });
}

export function useClassroomRoster(params: ClassroomRosterListParams | null) {
  return useQuery({
    queryKey: [KEY, "roster", params],
    queryFn: () => schoolStructureService.listRoster(params!),
    enabled: Boolean(params),
  });
}

export function useCreateClassroomStudentComment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: schoolStructureService.createStudentComment,
    onSuccess: async (created, input) => {
      client.setQueriesData<PaginatedClassroomRoster>(
        { queryKey: [KEY, "roster"] },
        (current) =>
          current
            ? {
                ...current,
                data: current.data.map((student) =>
                  student.studentUuid === input.studentUuid
                    ? { ...student, teacherComment: created.teacherComment }
                    : student,
                ),
              }
            : current,
      );
      await client.invalidateQueries({ queryKey: [KEY, "roster"] });
      await client.invalidateQueries({
        queryKey: [KEY, "student-comments", input.studentUuid],
      });
    },
    meta: { successMessage: "บันทึกความคิดเห็นแล้ว" },
  });
}

export function useStudentClassroomComments(studentTermId: string) {
  return useQuery({
    queryKey: [KEY, "student-comments", studentTermId],
    queryFn: () =>
      schoolStructureService.listStudentClassroomComments(studentTermId),
    enabled: Boolean(studentTermId),
  });
}

export function useClassroomDailyAttendance(
  params: ClassroomAttendanceHistoryParams | null,
) {
  return useQuery({
    queryKey: [KEY, "attendance-history", "daily", params],
    queryFn: () => schoolStructureService.listClassroomDailyAttendance(params!),
    enabled: Boolean(params),
  });
}

export function useClassroomStudentAttendance(
  params: ClassroomAttendanceHistoryParams | null,
) {
  return useQuery({
    queryKey: [KEY, "attendance-history", "student", params],
    queryFn: () =>
      schoolStructureService.listClassroomStudentAttendance(params!),
    enabled: Boolean(params),
  });
}

export function useStudentAttendanceDays(
  params: (ClassroomAttendanceHistoryParams & { studentUuid: string }) | null,
) {
  return useQuery({
    queryKey: [KEY, "attendance-history", "student-days", params],
    queryFn: () => schoolStructureService.listStudentAttendanceDays(params!),
    enabled: Boolean(params),
  });
}

export function useTeacherRosterImport() {
  const client = useQueryClient();
  const preview = useMutation({
    mutationFn: ({ file, schoolId }: { file: File; schoolId: number }) =>
      importService.previewTeacherImport(file, schoolId),
    meta: { suppressSuccessToast: true },
  });
  const submit = useMutation({
    mutationFn: ({ file, schoolId }: { file: File; schoolId: number }) =>
      importService.submitTeacherImport(file, schoolId),
    onSuccess: async () =>
      client.invalidateQueries({ queryKey: [KEY, "teachers"] }),
  });
  return { preview, submit };
}
