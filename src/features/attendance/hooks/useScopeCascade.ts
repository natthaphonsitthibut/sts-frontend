import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  attendanceLookupService,
  type GradeLevelOption,
  type SchoolOption,
} from "../../tasks/api/attendance-lookup.service";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";

const EMPTY_GRADE_LEVELS: GradeLevelOption[] = [];
const EMPTY_SCHOOLS: SchoolOption[] = [];
const EMPTY_ROOMS: string[] = [];

interface UseScopeCascadeOptions {
  /**
   * Constrain and *lock* fields to the logged-in actor's data scope, so every
   * link-creation flow stays inside the creator's own scope (e.g. a single-school
   * director can only target that school). The school list is already
   * actor-scoped by the backend; this also pins grade/room when the actor's
   * scope fixes them. Off by default so the check-in page keeps its behaviour.
   */
  lockToActorScope?: boolean;
}

function singleId(values: Array<string | number> | undefined): string {
  return values?.length === 1 ? String(values[0]) : "";
}

/**
 * Shared school → grade → room picker cascade.
 *
 * One source of truth for the "เลือกโรงเรียน → ชั้น → ห้อง" flow used on the
 * check-in page and the create-link page: grade is gated on a chosen school,
 * room is gated on a chosen grade, picking a school clears a stale room, and the
 * effective room is *derived* instead of stored-then-synced. With
 * `lockToActorScope`, any level the actor's scope already fixes is preselected
 * and locked.
 */
export function useScopeCascade(options: UseScopeCascadeOptions = {}) {
  const lock = options.lockToActorScope ?? false;
  const actorScope = useAuthSessionStore((state) => state.user?.data_scope);

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

  const [schoolIdState, setSchoolIdState] = useState("");
  const [gradeState, setGradeState] = useState("");
  const [roomInput, setRoomInput] = useState("");

  // A level the actor's scope pins (or the only option they can see) is locked.
  const lockedSchoolId = lock
    ? schools.length === 1
      ? String(schools[0].id)
      : singleId(actorScope?.school_ids)
    : "";
  const schoolLocked = Boolean(lockedSchoolId);
  const schoolId = schoolLocked ? lockedSchoolId : schoolIdState;

  // grade is keyed by label in this cascade, so map the actor's grade id → label.
  const lockedGradeLabel =
    lock && actorScope?.grade_levels?.length === 1
      ? gradeLevels.find((grade) => String(grade.id) === String(actorScope.grade_levels?.[0]))
          ?.label ?? ""
      : "";
  const gradeLocked = Boolean(lockedGradeLabel);
  const grade = gradeLocked ? lockedGradeLabel : gradeState;

  const roomsQuery = useQuery({
    queryKey: ["scope-cascade-rooms", grade, schoolId],
    queryFn: () => attendanceLookupService.getRooms(grade, schoolId),
    enabled: Boolean(grade),
  });
  const rooms = roomsQuery.data ?? EMPTY_ROOMS;

  const lockedRoom = lock ? singleId(actorScope?.room_ids) : "";
  const roomLocked = Boolean(lockedRoom);
  const room = roomLocked ? lockedRoom : rooms.includes(roomInput) ? roomInput : "";

  function setSchoolId(value: string): void {
    if (schoolLocked) return;
    setSchoolIdState(value);
    setRoomInput("");
  }

  function setGrade(value: string): void {
    if (gradeLocked) return;
    setGradeState(value);
    setRoomInput("");
  }

  function setRoom(value: string): void {
    if (roomLocked) return;
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
    schoolLocked,
    gradeLocked,
    roomLocked,
    setSchoolId,
    setGrade,
    setRoom,
    reset,
  };
}
