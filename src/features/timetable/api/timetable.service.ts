import { apiClient } from "../../../lib/api-client";
import type {
  CreateTimetableSlotPayload,
  GeneratePeriodTimesPayload,
  OverridePeriodTimePayload,
  RoomSubject,
  SchoolPeriodTime,
  TimetableSlot,
  TimetableTeacherCandidate,
  UpdateTimetableSlotPayload,
} from "../types/timetable.types";

interface RoomFilter {
  schoolId: number;
  gradeLevelId: number;
  roomNo: number;
}

async function listSlots(filter: RoomFilter): Promise<{ success: true; data: TimetableSlot[] }> {
  const response = await apiClient.get<{ success: true; data: TimetableSlot[] }>(
    "/timetable/slots",
    { params: { schoolId: filter.schoolId, gradeLevelId: filter.gradeLevelId, roomNo: filter.roomNo } },
  );
  return response.data;
}

async function getSubjectsForRoom(
  filter: RoomFilter,
): Promise<{ success: true; data: RoomSubject[] }> {
  const response = await apiClient.get<{ success: true; data: RoomSubject[] }>(
    "/timetable/subjects-for-room",
    { params: { schoolId: filter.schoolId, gradeLevelId: filter.gradeLevelId, roomNo: filter.roomNo } },
  );
  return response.data;
}

async function listTeacherCandidates(filter: {
  schoolId: number;
  searchTerm?: string;
  subjectId?: number;
  gradeLevelId?: number;
  roomNo?: number;
}): Promise<{ success: true; data: TimetableTeacherCandidate[] }> {
  const response = await apiClient.get<{ success: true; data: TimetableTeacherCandidate[] }>(
    "/timetable/teachers",
    {
      params: {
        schoolId: filter.schoolId,
        searchTerm: filter.searchTerm || undefined,
        subjectId: filter.subjectId || undefined,
        gradeLevelId: filter.gradeLevelId || undefined,
        roomNo: filter.roomNo || undefined,
      },
    },
  );
  return response.data;
}

async function createSlot(
  payload: CreateTimetableSlotPayload,
): Promise<{ success: true; data: TimetableSlot }> {
  const response = await apiClient.post<{ success: true; data: TimetableSlot }>(
    "/timetable/slots",
    payload,
  );
  return response.data;
}

async function updateSlot(
  id: string,
  payload: UpdateTimetableSlotPayload,
): Promise<{ success: true; data: TimetableSlot }> {
  const response = await apiClient.patch<{ success: true; data: TimetableSlot }>(
    `/timetable/slots/${id}`,
    payload,
  );
  return response.data;
}

async function deleteSlot(id: string): Promise<{ success: true }> {
  const response = await apiClient.delete<{ success: true }>(`/timetable/slots/${id}`);
  return response.data;
}

async function listPeriodTimes(
  schoolId: number,
): Promise<{ success: true; data: SchoolPeriodTime[] }> {
  const response = await apiClient.get<{ success: true; data: SchoolPeriodTime[] }>(
    "/timetable/period-times",
    { params: { schoolId } },
  );
  return response.data;
}

async function generatePeriodTimes(
  payload: GeneratePeriodTimesPayload,
): Promise<{ success: true; data: SchoolPeriodTime[] }> {
  const response = await apiClient.post<{ success: true; data: SchoolPeriodTime[] }>(
    "/timetable/period-times/generate",
    payload,
  );
  return response.data;
}

async function overridePeriodTime(
  payload: OverridePeriodTimePayload,
): Promise<{ success: true; data: SchoolPeriodTime[] }> {
  const response = await apiClient.patch<{ success: true; data: SchoolPeriodTime[] }>(
    "/timetable/period-times/override",
    payload,
  );
  return response.data;
}

export const timetableService = {
  listSlots,
  getSubjectsForRoom,
  listTeacherCandidates,
  createSlot,
  updateSlot,
  deleteSlot,
  listPeriodTimes,
  generatePeriodTimes,
  overridePeriodTime,
};
