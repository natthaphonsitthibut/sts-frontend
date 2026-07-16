import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolStructureService } from "../api/school-structure.service";
import { importService } from "../../import-data/api/import.service";
import type { CreateClassroomInput } from "../types/school-structure.types";
import type {
  ClassroomRosterListParams,
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

export function useSchoolClassroomOptions(params: {
  schoolId: number;
  termId?: number;
  gradeLevelId?: number;
} | null) {
  return useQuery({
    queryKey: [KEY, "classroom-options", params],
    queryFn: () => schoolStructureService.listClassroomOptions(params!),
    enabled: Boolean(params),
  });
}

export function useCreateSchoolClassroom() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClassroomInput) => schoolStructureService.createClassroom(input),
    onSuccess: async () => client.invalidateQueries({ queryKey: [KEY, "classrooms"] }),
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
    onSuccess: async () => client.invalidateQueries({ queryKey: [KEY, "assignments"] }),
  });
}

export function useClassroomRoster(params: ClassroomRosterListParams | null) {
  return useQuery({
    queryKey: [KEY, "roster", params],
    queryFn: () => schoolStructureService.listRoster(params!),
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
    onSuccess: async () => client.invalidateQueries({ queryKey: [KEY, "teachers"] }),
  });
  return { preview, submit };
}
