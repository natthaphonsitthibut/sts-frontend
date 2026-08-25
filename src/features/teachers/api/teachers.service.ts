import { apiClient } from "../../../lib/api-client";
import {
  normalizePaginatedResponse,
  toPaginationParams,
  type PaginatedResult,
} from "../../../lib/pagination";
import type {
  Teacher,
  TeacherProfile,
  TeacherCreatePayload,
  TeacherListQuery,
  TeacherSavePayload,
  TeacherNationalIdRevealResponse,
} from "../types/teachers.types";

interface TeacherEnvelope {
  data?: Teacher;
}

interface TeacherProfileEnvelope {
  data?: TeacherProfile;
}

async function getTeachers(
  query: TeacherListQuery,
): Promise<PaginatedResult<Teacher>> {
  const params: Record<string, string> = toPaginationParams(query);
  params.schoolId = String(query.schoolId);
  if (query.teacherStatus) params.teacherStatus = query.teacherStatus;
  const searchTerm = query.searchTerm?.trim();
  if (searchTerm) params.searchTerm = searchTerm;
  if (query.sortBy) params.sortBy = query.sortBy;
  if (query.sortOrder) params.sortOrder = query.sortOrder;

  const response = await apiClient.get("/teachers", { params });
  return normalizePaginatedResponse<Teacher>(response.data, query);
}

async function getTeacherProfiles(
  query: TeacherListQuery,
): Promise<PaginatedResult<TeacherProfile>> {
  const params: Record<string, string> = toPaginationParams(query);
  params.schoolId = String(query.schoolId);
  if (query.teacherStatus) params.teacherStatus = query.teacherStatus;
  const searchTerm = query.searchTerm?.trim();
  if (searchTerm) params.searchTerm = searchTerm;
  if (query.sortBy) params.sortBy = query.sortBy;
  if (query.sortOrder) params.sortOrder = query.sortOrder;
  const response = await apiClient.get("/teacher-profiles", { params });
  return normalizePaginatedResponse<TeacherProfile>(response.data, query);
}

async function getTeacher(id: string): Promise<Teacher> {
  const response = await apiClient.get<TeacherEnvelope>(
    `/teachers/${encodeURIComponent(id)}`,
  );
  const teacher = response.data?.data;
  if (!teacher) throw new Error("ไม่พบข้อมูลครู");
  return teacher;
}

async function getTeacherProfile(id: string): Promise<TeacherProfile> {
  const response = await apiClient.get<TeacherProfileEnvelope>(
    `/teacher-profiles/${encodeURIComponent(id)}`,
  );
  const teacher = response.data?.data;
  if (!teacher) throw new Error("ไม่พบข้อมูลครู");
  return teacher;
}

async function revealTeacherNationalId(
  id: string,
  payload: { reason_code: string; reason_note?: string },
): Promise<TeacherNationalIdRevealResponse> {
  const response = await apiClient.post<TeacherNationalIdRevealResponse>(
    `/teacher-profiles/${encodeURIComponent(id)}/pii-reveal`,
    { field_group: "NATIONAL_ID", ...payload },
  );
  return response.data;
}

async function createTeacher(payload: TeacherCreatePayload): Promise<Teacher> {
  const response = await apiClient.post<TeacherEnvelope>("/teachers", payload);
  const teacher = response.data?.data;
  if (!teacher) throw new Error("บันทึกข้อมูลครูไม่สำเร็จ");
  return teacher;
}

async function updateTeacher(
  id: string,
  payload: TeacherSavePayload,
): Promise<Teacher> {
  const response = await apiClient.patch<TeacherEnvelope>(
    `/teachers/${encodeURIComponent(id)}`,
    payload,
  );
  const teacher = response.data?.data;
  if (!teacher) throw new Error("บันทึกข้อมูลครูไม่สำเร็จ");
  return teacher;
}

/** Upload replaces the photo; passing no file with `remove` clears it. */
async function updateTeacherPhoto(
  id: string,
  input: { photo?: File; remove?: boolean },
): Promise<void> {
  const form = new FormData();
  if (input.photo) form.append("photo", input.photo);
  if (input.remove) form.append("removePhoto", "true");
  await apiClient.patch(`/teachers/${encodeURIComponent(id)}/photo`, form);
}

async function deactivateTeacher(id: string, note?: string): Promise<void> {
  await apiClient.delete(`/teachers/${encodeURIComponent(id)}`, {
    data: note ? { note } : {},
  });
}

export const teachersService = {
  getTeachers,
  getTeacherProfiles,
  getTeacher,
  getTeacherProfile,
  revealTeacherNationalId,
  createTeacher,
  updateTeacher,
  updateTeacherPhoto,
  deactivateTeacher,
};
