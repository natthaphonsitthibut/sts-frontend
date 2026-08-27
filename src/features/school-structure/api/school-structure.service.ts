import { apiClient } from "../../../lib/api-client";
import type { StudentReadSource } from "../../students/api/students.service";
import type {
  ClassroomTeacherAssignment,
  ClassroomStudentCommentResult,
  ClassroomStudentProblemCategory,
  ClassroomStudentProblemCategoryOption,
  ClassroomStudentCommentConcernLevel,
  ClassroomStudentCommentConcernLevelOption,
  CreateClassroomInput,
  UpdateClassroomInput,
  PaginatedClassroomRoster,
  PaginatedClassroomDailyAttendance,
  PaginatedClassroomStudentAttendance,
  PaginatedClassroomStudentAttendanceDays,
  PaginatedSchoolClassrooms,
  PaginatedSchoolTeachers,
  SchoolClassroom,
  SchoolClassroomOption,
  SchoolTeacherMembership,
  ScopedSchool,
  StudentClassroomCommentsResponse,
  UpdateClassroomPresentationInput,
} from "../types/school-structure.types";

interface DataEnvelope<T> {
  data: T;
}

export interface SchoolClassroomListParams {
  schoolId: number;
  termId?: number;
  gradeLevelId?: number;
  classroomId?: number;
  search?: string;
  page: number;
  limit: number;
  sortBy?: "room" | "grade" | "students" | "homeroomTeacher";
  sortDirection?: "asc" | "desc";
}

export interface SchoolTeacherListParams {
  schoolId: number;
  termId?: number;
  gradeLevelId?: number;
  classroomId?: number;
  assignedToFilteredClassrooms: boolean;
  page: number;
  limit: number;
  sortBy?: "name" | "status";
  sortDirection?: "asc" | "desc";
}

export interface ClassroomRosterListParams {
  search?: string;
  riskTier?: string;
  schoolId?: number;
  termId?: number;
  gradeLevelId?: number;
  classroomId?: number;
  page: number;
  limit: number;
  sortBy?: "studentNumber" | "name" | "comment" | "status";
  sortDirection?: "asc" | "desc";
}

export interface ClassroomAttendanceHistoryParams {
  classroomId: number;
  view: "DAILY" | "STUDENT";
  /** Narrows the history to one subject; omitted means the whole day. */
  subjectId?: number;
  studentUuid?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?:
    | "date"
    | "time"
    | "recordedBy"
    | "studentNumber"
    | "name"
    | "status"
    | "present"
    | "late"
    | "leave"
    | "absent";
  sortDirection?: "asc" | "desc";
  page: number;
  limit: number;
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

async function getClassroom(classroomId: string): Promise<SchoolClassroom> {
  const response = await apiClient.get<DataEnvelope<SchoolClassroom>>(
    `/school-structure/classrooms/${encodeURIComponent(classroomId)}`,
  );
  return response.data.data;
}

async function createClassroom(
  input: CreateClassroomInput,
): Promise<SchoolClassroom> {
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

async function setClassroomFavorite(input: {
  classroomId: string;
  isFavorite: boolean;
}): Promise<void> {
  await apiClient.put(
    `/school-structure/classrooms/${encodeURIComponent(input.classroomId)}/favorite`,
    { isFavorite: input.isFavorite },
  );
}

async function updateClassroomPresentation({
  classroomId,
  cardCoverColor,
  coverImagePositionX,
  coverImagePositionY,
  coverImageScale,
  file,
  removeCover,
}: UpdateClassroomPresentationInput): Promise<SchoolClassroom> {
  const formData = new FormData();
  formData.append("cardCoverColor", cardCoverColor);
  formData.append("coverImagePositionX", String(coverImagePositionX));
  formData.append("coverImagePositionY", String(coverImagePositionY));
  formData.append("coverImageScale", String(coverImageScale));
  if (file) formData.append("photo", file);
  if (removeCover) formData.append("removeCover", "true");
  const response = await apiClient.patch<DataEnvelope<SchoolClassroom>>(
    `/school-structure/classrooms/${encodeURIComponent(classroomId)}/presentation`,
    formData,
  );
  return response.data.data;
}

async function listTeachers(
  params: SchoolTeacherListParams,
): Promise<PaginatedSchoolTeachers> {
  const response = await apiClient.get<PaginatedSchoolTeachers>(
    "/school-structure/teachers",
    { params },
  );
  return response.data;
}

async function listTeacherOptions(
  schoolId: number,
): Promise<SchoolTeacherMembership[]> {
  const response = await apiClient.get<DataEnvelope<SchoolTeacherMembership[]>>(
    "/school-structure/teachers/options",
    { params: { schoolId } },
  );
  return response.data.data ?? [];
}

async function listAssignments(
  classroomId: number,
): Promise<ClassroomTeacherAssignment[]> {
  const response = await apiClient.get<
    DataEnvelope<ClassroomTeacherAssignment[]>
  >("/school-structure/assignments", { params: { classroomId } });
  return response.data.data ?? [];
}

async function setHomeroomTeachers(input: {
  classroomId: number;
  teacherMembershipIds: number[];
}): Promise<ClassroomTeacherAssignment[]> {
  const response = await apiClient.put<
    DataEnvelope<ClassroomTeacherAssignment[]>
  >(`/school-structure/classrooms/${input.classroomId}/homeroom-teachers`, {
    teacherMembershipIds: input.teacherMembershipIds,
  });
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

async function createStudentComment(input: {
  classroomId: number;
  studentUuid: string;
  problemCategory: ClassroomStudentProblemCategory;
  concernLevelCode: ClassroomStudentCommentConcernLevel;
  problemDescription: string;
}): Promise<ClassroomStudentCommentResult> {
  const response = await apiClient.post<
    DataEnvelope<ClassroomStudentCommentResult>
  >(
    `/school-structure/classrooms/${input.classroomId}/students/${encodeURIComponent(input.studentUuid)}/comments`,
    {
      problemCategory: input.problemCategory,
      concernLevelCode: input.concernLevelCode,
      problemDescription: input.problemDescription,
    },
  );
  return response.data.data;
}

async function listStudentProblemCategories(): Promise<
  ClassroomStudentProblemCategoryOption[]
> {
  const response = await apiClient.get<
    DataEnvelope<ClassroomStudentProblemCategoryOption[]>
  >("/school-structure/student-problem-categories");
  return response.data.data;
}

async function listStudentCommentConcernLevels(): Promise<
  ClassroomStudentCommentConcernLevelOption[]
> {
  const response = await apiClient.get<
    DataEnvelope<ClassroomStudentCommentConcernLevelOption[]>
  >("/school-structure/student-comment-concern-levels");
  return response.data.data ?? [];
}

async function listStudentClassroomComments(
  studentTermId: string,
  source: StudentReadSource = "INTERNAL",
): Promise<StudentClassroomCommentsResponse> {
  const response = await apiClient.get<StudentClassroomCommentsResponse>(
    // A classroom link cannot call the staff route; its own namespace answers
    // the same list, bounded by the classroom the link belongs to.
    source === "INTERNAL"
      ? `/students/${encodeURIComponent(studentTermId)}/classroom-comments`
      : `/classroom/students/${encodeURIComponent(studentTermId)}/comments`,
  );
  return response.data;
}

async function listClassroomDailyAttendance(
  params: ClassroomAttendanceHistoryParams,
): Promise<PaginatedClassroomDailyAttendance> {
  const { classroomId, ...query } = params;
  const response = await apiClient.get<PaginatedClassroomDailyAttendance>(
    `/school-structure/classrooms/${classroomId}/attendance-history`,
    { params: query },
  );
  return response.data;
}

async function listClassroomStudentAttendance(
  params: ClassroomAttendanceHistoryParams,
): Promise<PaginatedClassroomStudentAttendance> {
  const { classroomId, ...query } = params;
  const response = await apiClient.get<PaginatedClassroomStudentAttendance>(
    `/school-structure/classrooms/${classroomId}/attendance-history`,
    { params: query },
  );
  return response.data;
}

async function listStudentAttendanceDays(
  params: ClassroomAttendanceHistoryParams & { studentUuid: string },
): Promise<PaginatedClassroomStudentAttendanceDays> {
  const { classroomId, ...query } = params;
  const response = await apiClient.get<PaginatedClassroomStudentAttendanceDays>(
    `/school-structure/classrooms/${classroomId}/attendance-history`,
    { params: query },
  );
  return response.data;
}

async function authorizeClassroomExport(input: {
  classroomId: number;
  exportScope: "ROSTER" | "ATTENDANCE";
  format: "pdf" | "xlsx" | "csv";
  columns: string[];
  dateFrom?: string;
  dateTo?: string;
}): Promise<void> {
  await apiClient.post(
    `/school-structure/classrooms/${input.classroomId}/export-events`,
    {
      exportScope: input.exportScope,
      format: input.format,
      columns: input.columns,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
    },
  );
}

export const schoolStructureService = {
  listSchools,
  listClassrooms,
  getClassroom,
  listClassroomOptions,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  setClassroomFavorite,
  updateClassroomPresentation,
  listTeachers,
  listTeacherOptions,
  listAssignments,
  setHomeroomTeachers,
  listRoster,
  listStudentProblemCategories,
  listStudentCommentConcernLevels,
  createStudentComment,
  listStudentClassroomComments,
  listClassroomDailyAttendance,
  listClassroomStudentAttendance,
  listStudentAttendanceDays,
  authorizeClassroomExport,
};
