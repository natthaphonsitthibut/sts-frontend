import { apiClient } from "../../../lib/api-client";
import type {
  ClassroomRosterStudent,
  ClassroomTeacherAssignment,
  CreateClassroomInput,
  SchoolClassroom,
  SchoolTeacherMembership,
  ScopedSchool,
} from "../types/school-structure.types";

interface DataEnvelope<T> {
  data: T;
}

async function listSchools(): Promise<ScopedSchool[]> {
  const response = await apiClient.get<DataEnvelope<ScopedSchool[]>>(
    "/school-structure/schools",
  );
  return response.data.data ?? [];
}

async function listClassrooms(schoolId: number, termId?: number): Promise<SchoolClassroom[]> {
  const response = await apiClient.get<DataEnvelope<SchoolClassroom[]>>(
    "/school-structure/classrooms",
    { params: { schoolId, termId } },
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

async function listTeachers(schoolId: number): Promise<SchoolTeacherMembership[]> {
  const response = await apiClient.get<DataEnvelope<SchoolTeacherMembership[]>>(
    "/school-structure/teachers",
    { params: { schoolId } },
  );
  return response.data.data ?? [];
}

async function createTeacherMembership(input: {
  schoolId: number;
  teacherUserId: number;
}): Promise<SchoolTeacherMembership> {
  const response = await apiClient.post<DataEnvelope<SchoolTeacherMembership>>(
    "/school-structure/teachers",
    input,
  );
  return response.data.data;
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

async function listRoster(classroomId: number): Promise<ClassroomRosterStudent[]> {
  const response = await apiClient.get<DataEnvelope<ClassroomRosterStudent[]>>(
    "/school-structure/roster",
    { params: { classroomId } },
  );
  return response.data.data ?? [];
}

export const schoolStructureService = {
  listSchools,
  listClassrooms,
  createClassroom,
  listTeachers,
  createTeacherMembership,
  listAssignments,
  createHomeroomAssignment,
  listRoster,
};
