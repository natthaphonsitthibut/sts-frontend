import { apiClient } from "../../../lib/api-client";
import {
  normalizePaginatedResponse,
  toPaginationParams,
  type PaginatedResult,
} from "../../../lib/pagination";
import type {
  CurriculumGrade,
  CurriculumGradeQuery,
  CurriculumSubject,
  CurriculumSubjectPayload,
  CurriculumSubjectQuery,
  CurriculumSubjectTeachersPayload,
} from "../types/curriculum.types";

interface Envelope<T> {
  data?: T;
}

async function getGrades(
  query: CurriculumGradeQuery,
): Promise<CurriculumGrade[]> {
  const response = await apiClient.get<Envelope<CurriculumGrade[]>>(
    "/subjects/school-catalog/grades",
    { params: query },
  );
  return response.data.data ?? [];
}

async function getSubjects(
  query: CurriculumSubjectQuery,
): Promise<PaginatedResult<CurriculumSubject>> {
  const response = await apiClient.get(
    "/subjects/school-catalog/grade-subjects",
    {
      params: { ...toPaginationParams(query), ...query },
    },
  );
  return normalizePaginatedResponse<CurriculumSubject>(response.data, query);
}

async function getSubject(
  id: number,
  query: CurriculumSubjectQuery,
): Promise<CurriculumSubject> {
  // Only the context the read needs. Sending the caller's page/limit along
  // would be validated against the allowed page sizes and rejected, and the
  // endpoint resolves one subject by id regardless.
  const response = await apiClient.get<Envelope<CurriculumSubject>>(
    `/subjects/school-catalog/grade-subjects/${id}`,
    {
      params: {
        schoolId: query.schoolId,
        termId: query.termId,
        gradeLevelId: query.gradeLevelId,
      },
    },
  );
  if (!response.data.data) throw new Error("ไม่พบรายวิชาในระดับชั้นนี้");
  return response.data.data;
}

async function createSubject(
  payload: CurriculumSubjectPayload,
): Promise<CurriculumSubject> {
  const response = await apiClient.post<Envelope<CurriculumSubject>>(
    "/subjects/school-catalog/grade-subjects",
    payload,
  );
  if (!response.data.data) throw new Error("บันทึกรายวิชาไม่สำเร็จ");
  return response.data.data;
}

async function updateSubject(
  id: number,
  payload: CurriculumSubjectPayload,
): Promise<CurriculumSubject> {
  const response = await apiClient.put<Envelope<CurriculumSubject>>(
    `/subjects/school-catalog/grade-subjects/${id}`,
    payload,
  );
  if (!response.data.data) throw new Error("บันทึกรายวิชาไม่สำเร็จ");
  return response.data.data;
}

async function deleteSubject(
  id: number,
  query: CurriculumSubjectQuery,
): Promise<void> {
  await apiClient.delete(`/subjects/school-catalog/grade-subjects/${id}`, {
    params: query,
  });
}

async function saveSubjectTeachers(
  payload: CurriculumSubjectTeachersPayload,
): Promise<void> {
  await apiClient.put(
    "/subjects/school-catalog/classroom-subject-teachers",
    payload,
  );
}

export const curriculumService = {
  createSubject,
  saveSubjectTeachers,
  deleteSubject,
  getGrades,
  getSubject,
  getSubjects,
  updateSubject,
};
