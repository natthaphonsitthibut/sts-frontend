import { apiClient } from "../../../lib/api-client";
import type {
  ClassroomTeacherAssignment,
  CreateClassroomInput,
  UpdateClassroomInput,
  PaginatedClassroomRoster,
  PaginatedSchoolClassrooms,
  PaginatedSchoolTeachers,
  SchoolClassroom,
  SchoolClassroomOption,
  SchoolTeacherMembership,
  ScopedSchool,
} from "../types/school-structure.types";

interface DataEnvelope<T> {
  data: T;
}

export interface SchoolClassroomListParams {
  schoolId: number;
  termId?: number;
  gradeLevelId?: number;
  classroomId?: number;
  page: number;
  limit: number;
  sortBy: "room" | "grade" | "students";
  sortDirection: "asc" | "desc";
}

export interface SchoolTeacherListParams {
  schoolId: number;
  termId?: number;
  gradeLevelId?: number;
  classroomId?: number;
  assignedToFilteredClassrooms: boolean;
  page: number;
  limit: number;
  sortBy: "name" | "status";
  sortDirection: "asc" | "desc";
}

export interface ClassroomRosterListParams {
  schoolId?: number;
  termId?: number;
  gradeLevelId?: number;
  classroomId?: number;
  page: number;
  limit: number;
  sortBy: "name" | "status";
  sortDirection: "asc" | "desc";
}

async function listSchools(): Promise<ScopedSchool[]> {
  const response = await apiClient.get<DataEnvelope<ScopedSchool[]>>(
    "/school-structure/schools",
  );
  return response.data.data ?? [];
}

async function listClassrooms(
  params: SchoolClassroomListParams,
): Promise<PaginatedSchoolClassrooms> {
  const response = await apiClient.get<PaginatedSchoolClassrooms>(
    "/school-structure/classrooms",
    { params },
  );
  return response.data;
}

async function listClassroomOptions(params: {
  schoolId: number;
  termId?: number;
  gradeLevelId?: number;
}): Promise<SchoolClassroomOption[]> {
  const response = await apiClient.get<DataEnvelope<SchoolClassroomOption[]>>(
    "/school-structure/classrooms/options",
    { params },
  );
  return response.data.data ?? [];
}

async function createClassroom(input: CreateClassroomInput): Promise<SchoolClassroom> {
  const response = await apiClient.post<DataEnvelope<SchoolClassroom>>(
    "/school-structure/classrooms",
    input,
  );
  return response.data.data;
}

async function updateClassroom({
  classroomId,
  ...input
}: UpdateClassroomInput): Promise<SchoolClassroom> {
  const response = await apiClient.patch<DataEnvelope<SchoolClassroom>>(
    `/school-structure/classrooms/${classroomId}`,
    input,
  );
  return response.data.data;
}

async function deleteClassroom(classroomId: string): Promise<void> {
  await apiClient.delete(`/school-structure/classrooms/${classroomId}`);
}

async function listTeachers(params: SchoolTeacherListParams): Promise<PaginatedSchoolTeachers> {
  const response = await apiClient.get<PaginatedSchoolTeachers>(
    "/school-structure/teachers",
    { params },
  );
  return response.data;
}

async function listTeacherOptions(schoolId: number): Promise<SchoolTeacherMembership[]> {
  const response = await apiClient.get<DataEnvelope<SchoolTeacherMembership[]>>(
    "/school-structure/teachers/options",
    { params: { schoolId } },
  );
  return response.data.data ?? [];
}

async function listAssignments(classroomId: number): Promise<ClassroomTeacherAssignment[]> {
  const response = await apiClient.get<DataEnvelope<ClassroomTeacherAssignment[]>>(
    "/school-structure/assignments",
    { params: { classroomId } },
  );
  return response.data.data ?? [];
}

async function createHomeroomAssignment(input: {
  classroomId: number;
  teacherMembershipId: number;
}): Promise<ClassroomTeacherAssignment> {
  const response = await apiClient.post<DataEnvelope<ClassroomTeacherAssignment>>(
    "/school-structure/assignments",
    { ...input, assignmentKind: "HOMEROOM" },
  );
  return response.data.data;
}

async function listRoster(
  params: ClassroomRosterListParams,
): Promise<PaginatedClassroomRoster> {
  const response = await apiClient.get<PaginatedClassroomRoster>(
    "/school-structure/roster",
    { params },
  );
  return response.data;
}

export const schoolStructureService = {
  listSchools,
  listClassrooms,
  listClassroomOptions,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  listTeachers,
  listTeacherOptions,
  listAssignments,
  createHomeroomAssignment,
  listRoster,
};
