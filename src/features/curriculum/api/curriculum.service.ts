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
} from "../types/curriculum.types";

interface Envelope<T> {
  data?: T;
}

async function getGrades(query: CurriculumGradeQuery): Promise<CurriculumGrade[]> {
  const params: Record<string, string> = { schoolId: String(query.schoolId) };
  if (query.termId) params.termId = String(query.termId);
  const searchTerm = query.searchTerm?.trim();
  if (searchTerm) params.searchTerm = searchTerm;

  const response = await apiClient.get<Envelope<CurriculumGrade[]>>("/curriculum/grades", {
    params,
  });
  return response.data?.data ?? [];
}

async function getSubjects(
  query: CurriculumSubjectQuery,
): Promise<PaginatedResult<CurriculumSubject>> {
  const params: Record<string, string> = toPaginationParams(query);
  params.schoolId = String(query.schoolId);
  params.termId = String(query.termId);
  params.gradeLevelId = String(query.gradeLevelId);
  const searchTerm = query.searchTerm?.trim();
  if (searchTerm) params.searchTerm = searchTerm;

  const response = await apiClient.get("/curriculum/subjects", { params });
  return normalizePaginatedResponse<CurriculumSubject>(response.data, query);
}

async function getSubject(id: string): Promise<CurriculumSubject> {
  const response = await apiClient.get<Envelope<CurriculumSubject>>(
    `/curriculum/subjects/${encodeURIComponent(id)}`,
  );
  const subject = response.data?.data;
  if (!subject) throw new Error("ไม่พบรายวิชาในหลักสูตร");
  return subject;
}

async function createSubject(payload: CurriculumSubjectPayload): Promise<CurriculumSubject> {
  const response = await apiClient.post<Envelope<CurriculumSubject>>(
    "/curriculum/subjects",
    payload,
  );
  const subject = response.data?.data;
  if (!subject) throw new Error("บันทึกรายวิชาไม่สำเร็จ");
  return subject;
}

async function updateSubject(
  id: string,
  payload: CurriculumSubjectPayload,
): Promise<CurriculumSubject> {
  const response = await apiClient.put<Envelope<CurriculumSubject>>(
    `/curriculum/subjects/${encodeURIComponent(id)}`,
    payload,
  );
  const subject = response.data?.data;
  if (!subject) throw new Error("บันทึกรายวิชาไม่สำเร็จ");
  return subject;
}

/** Upload replaces the PDF; passing no file with `remove` clears it. */
async function updateSubjectContent(
  id: string,
  input: { content?: File; remove?: boolean },
): Promise<void> {
  const form = new FormData();
  if (input.content) form.append("content", input.content);
  if (input.remove) form.append("removeContent", "true");
  await apiClient.patch(`/curriculum/subjects/${encodeURIComponent(id)}/content`, form);
}

async function deleteSubject(id: string): Promise<void> {
  await apiClient.delete(`/curriculum/subjects/${encodeURIComponent(id)}`);
}

export const curriculumService = {
  getGrades,
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  updateSubjectContent,
  deleteSubject,
};
