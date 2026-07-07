import { apiClient } from "../../../lib/api-client";
import type {
  CreateTimetableSlotPayload,
  RoomSubject,
  TimetableSlot,
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

async function getMySchedule(filter: {
  schoolId?: number;
  gradeLevelId?: number;
  roomNo?: number;
  mine?: boolean;
}): Promise<{ success: true; data: TimetableSlot[] }> {
  const response = await apiClient.get<{ success: true; data: TimetableSlot[] }>(
    "/timetable/my-schedule",
    {
      params: {
        schoolId: filter.schoolId,
        gradeLevelId: filter.gradeLevelId,
        roomNo: filter.roomNo,
        mine: filter.mine || undefined,
      },
    },
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

export const timetableService = {
  listSlots,
  getMySchedule,
  getSubjectsForRoom,
  createSlot,
  updateSlot,
  deleteSlot,
};
