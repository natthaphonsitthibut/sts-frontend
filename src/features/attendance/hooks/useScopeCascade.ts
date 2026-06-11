import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  attendanceLookupService,
  type GradeLevelOption,
  type SchoolOption,
} from "../../tasks/api/attendance-lookup.service";

const EMPTY_GRADE_LEVELS: GradeLevelOption[] = [];
const EMPTY_SCHOOLS: SchoolOption[] = [];
const EMPTY_ROOMS: string[] = [];

/**
 * Shared school → grade → room picker cascade.
 *
 * One source of truth for the "เลือกโรงเรียน → ชั้น → ห้อง" flow used on the
 * check-in page and the create-link page: grade is gated on a chosen school,
 * room is gated on a chosen grade, picking a school clears a stale room, and the
 * effective room is *derived* (a room the new grade/school no longer offers
 * falls back to empty) instead of being stored-then-synced.
 */
export function useScopeCascade() {
  const gradeLevelsQuery = useQuery({
    queryKey: ["scope-cascade-grade-levels"],
    queryFn: attendanceLookupService.getGradeLevels,
  });
  const schoolsQuery = useQuery({
    queryKey: ["scope-cascade-schools"],
    queryFn: attendanceLookupService.getSchools,
  });

  const gradeLevels = gradeLevelsQuery.data ?? EMPTY_GRADE_LEVELS;
  const schools = schoolsQuery.data ?? EMPTY_SCHOOLS;

  const [schoolId, setSchoolIdState] = useState("");
  const [grade, setGradeState] = useState("");
  const [roomInput, setRoomInput] = useState("");

  const roomsQuery = useQuery({
    queryKey: ["scope-cascade-rooms", grade, schoolId],
    queryFn: () => attendanceLookupService.getRooms(grade, schoolId),
    enabled: Boolean(grade),
  });
  const rooms = roomsQuery.data ?? EMPTY_ROOMS;
  const room = rooms.includes(roomInput) ? roomInput : "";

  function setSchoolId(value: string): void {
    setSchoolIdState(value);
    setRoomInput("");
  }

  function setGrade(value: string): void {
    setGradeState(value);
    setRoomInput("");
  }

  function setRoom(value: string): void {
    setRoomInput(value);
  }

  function reset(): void {
    setSchoolIdState("");
    setGradeState("");
    setRoomInput("");
  }

  return {
    schools,
    gradeLevels,
    rooms,
    schoolId,
    grade,
    room,
    setSchoolId,
    setGrade,
    setRoom,
    reset,
  };
}
