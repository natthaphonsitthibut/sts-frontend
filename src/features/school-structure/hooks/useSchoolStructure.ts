import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schoolStructureService } from "../api/school-structure.service";
import { importService } from "../../import-data/api/import.service";
import type { CreateClassroomInput } from "../types/school-structure.types";

const KEY = "school-structure";

export function useScopedSchools() {
  return useQuery({
    queryKey: [KEY, "schools"],
    queryFn: schoolStructureService.listSchools,
  });
}

export function useSchoolClassrooms(schoolId?: number, termId?: number) {
  return useQuery({
    queryKey: [KEY, "classrooms", schoolId, termId],
    queryFn: () => schoolStructureService.listClassrooms(schoolId!, termId),
    enabled: Boolean(schoolId),
  });
}

export function useCreateSchoolClassroom() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClassroomInput) => schoolStructureService.createClassroom(input),
    onSuccess: async () => client.invalidateQueries({ queryKey: [KEY, "classrooms"] }),
  });
}

export function useSchoolTeachers(schoolId?: number) {
  return useQuery({
    queryKey: [KEY, "teachers", schoolId],
    queryFn: () => schoolStructureService.listTeachers(schoolId!),
    enabled: Boolean(schoolId),
  });
}

export function useCreateSchoolTeacher() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: schoolStructureService.createTeacherMembership,
    onSuccess: async () => client.invalidateQueries({ queryKey: [KEY, "teachers"] }),
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

export function useClassroomRoster(classroomId?: number) {
  return useQuery({
    queryKey: [KEY, "roster", classroomId],
    queryFn: () => schoolStructureService.listRoster(classroomId!),
    enabled: Boolean(classroomId),
  });
}

export function useTeacherRosterImport() {
  const client = useQueryClient();
  const preview = useMutation({
    mutationFn: ({ file, schoolId }: { file: File; schoolId: number }) =>
      importService.previewTeacherImport(file, schoolId),
  });
  const submit = useMutation({
    mutationFn: ({ file, schoolId }: { file: File; schoolId: number }) =>
      importService.submitTeacherImport(file, schoolId),
    onSuccess: async () => client.invalidateQueries({ queryKey: [KEY, "teachers"] }),
  });
  return { preview, submit };
}
