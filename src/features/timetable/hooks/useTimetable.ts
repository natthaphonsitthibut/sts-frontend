import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { timetableService } from "../api/timetable.service";
import type { CreateTimetableSlotPayload, UpdateTimetableSlotPayload } from "../types/timetable.types";

const SLOTS_QUERY_KEY = "timetable-slots";
const MY_SCHEDULE_QUERY_KEY = "my-schedule";
const ROOM_SUBJECTS_QUERY_KEY = "room-subjects";
const TIMETABLE_TEACHERS_QUERY_KEY = "timetable-teachers";

interface RoomFilter {
  schoolId: number;
  gradeLevelId: number;
  roomNo: number;
}

export function useTimetableSlots(filter: RoomFilter | null) {
  return useQuery({
    queryKey: [SLOTS_QUERY_KEY, filter],
    queryFn: () => timetableService.listSlots(filter!),
    enabled: Boolean(filter),
  });
}

export function useMySchedule(filter: {
  schoolId?: number;
  gradeLevelId?: number;
  roomNo?: number;
  mine?: boolean;
}) {
  const ready = filter.mine || (filter.schoolId !== undefined && filter.gradeLevelId !== undefined && filter.roomNo !== undefined);
  return useQuery({
    queryKey: [MY_SCHEDULE_QUERY_KEY, filter],
    queryFn: () => timetableService.getMySchedule(filter),
    enabled: ready,
  });
}

export function useRoomSubjects(filter: RoomFilter | null) {
  return useQuery({
    queryKey: [ROOM_SUBJECTS_QUERY_KEY, filter],
    queryFn: () => timetableService.getSubjectsForRoom(filter!),
    enabled: Boolean(filter),
  });
}

export function useTimetableTeachers(filter: { schoolId: number; searchTerm?: string } | null) {
  return useQuery({
    queryKey: [TIMETABLE_TEACHERS_QUERY_KEY, filter],
    queryFn: () => timetableService.listTeacherCandidates(filter!),
    enabled: Boolean(filter),
  });
}

export function useCreateTimetableSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTimetableSlotPayload) => timetableService.createSlot(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [SLOTS_QUERY_KEY] });
    },
  });
}

export function useUpdateTimetableSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTimetableSlotPayload }) =>
      timetableService.updateSlot(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [SLOTS_QUERY_KEY] });
    },
  });
}

export function useDeleteTimetableSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => timetableService.deleteSlot(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [SLOTS_QUERY_KEY] });
    },
  });
}
