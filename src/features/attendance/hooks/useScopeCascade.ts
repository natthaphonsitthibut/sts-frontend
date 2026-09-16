import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  attendanceLookupService,
  type GradeLevelOption,
} from "../../tasks/api/attendance-lookup.service";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";

const EMPTY_GRADE_LEVELS: GradeLevelOption[] = [];
const EMPTY_ROOMS: string[] = [];

interface UseScopeCascadeOptions {
  /**
   * Constrain and *lock* fields to the logged-in actor's data scope, so every
   * link-creation flow stays inside the creator's own scope (e.g. a single-school
   * director can only target that school). The locked school comes from the
   * actor's own scope; this also pins grade/room when the actor's scope fixes
   * them. The school *options* are supplied by `useSchoolAreaFilter` (server
   * driven). Off by default so the check-in page keeps its behaviour.
   */
  lockToActorScope?: boolean;
  /**
   * Have the school level track an externally-owned value (the global school
   * filter) instead of managing its own — grade/room still cascade locally
   * and reset whenever this changes, exactly as they do after a local
   * `setSchoolId` call. Ignored while `lockToActorScope` has already fixed
   * the school.
   */
  controlledSchoolId?: string;
  initialSchoolId?: string;
  initialGrade?: string;
  initialRoom?: string;
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
  const gradeLevels = gradeLevelsQuery.data ?? EMPTY_GRADE_LEVELS;

  const [schoolIdState, setSchoolIdState] = useState(
    options.initialSchoolId ?? "",
  );
  const [gradeState, setGradeState] = useState(options.initialGrade ?? "");
  const [roomInput, setRoomInput] = useState(options.initialRoom ?? "");

  // The locked school comes straight from the actor's own scope.
  const lockedSchoolId = lock ? singleId(actorScope?.school_ids) : "";
  const schoolLocked = Boolean(lockedSchoolId);
  const isControlled =
    !schoolLocked && options.controlledSchoolId !== undefined;
  const schoolId = schoolLocked
    ? lockedSchoolId
    : isControlled
      ? (options.controlledSchoolId as string)
      : schoolIdState;

  // grade is keyed by label in this cascade, so map the actor's grade id → label.
  const lockedGradeLabel =
    lock && actorScope?.grade_levels?.length === 1
      ? (gradeLevels.find(
          (grade) => String(grade.id) === String(actorScope.grade_levels?.[0]),
        )?.label ?? "")
      : "";
  const gradeLocked = Boolean(lockedGradeLabel);

  // A controlled school swap is the same event as picking a new school
  // locally: grade/room must cascade from it. Adjusting this mid-render (via
  // state, not a ref — the documented pattern for resetting state on a prop
  // change) means no stale room list for the old school ever paints before
  // the reset lands.
  const [lastControlledSchoolId, setLastControlledSchoolId] = useState(
    options.controlledSchoolId,
  );
  if (isControlled && lastControlledSchoolId !== options.controlledSchoolId) {
    setLastControlledSchoolId(options.controlledSchoolId);
    if (!gradeLocked && gradeState !== "") setGradeState("");
    if (roomInput !== "") setRoomInput("");
  }

  const grade = gradeLocked ? lockedGradeLabel : gradeState;

  const roomsQuery = useQuery({
    queryKey: ["scope-cascade-rooms", grade, schoolId],
    queryFn: () => attendanceLookupService.getRooms(grade, schoolId),
    enabled: Boolean(grade),
  });
  const rooms = roomsQuery.data ?? EMPTY_ROOMS;

  const lockedRoom = lock ? singleId(actorScope?.room_ids) : "";
  const roomLocked = Boolean(lockedRoom);
  const room = roomLocked
    ? lockedRoom
    : rooms.includes(roomInput)
      ? roomInput
      : "";

  function setSchoolId(value: string): void {
    if (schoolLocked || isControlled) return;
    setSchoolIdState(value);
    if (!gradeLocked) {
      setGradeState("");
    }
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
    gradeLevels,
    rooms,
    schoolId,
    gradeLevelId: grade
      ? (gradeLevels.find((level) => level.label === grade)?.id ?? null)
      : null,
    grade,
    room,
    schoolLocked,
    gradeLocked,
    roomLocked,
    setSchoolId,
    setGrade,
    setRoom,
    reset,
    dataUpdatedAt: Math.max(
      gradeLevelsQuery.dataUpdatedAt,
      roomsQuery.dataUpdatedAt,
    ),
    refetch: () =>
      Promise.all([
        gradeLevelsQuery.refetch(),
        ...(grade ? [roomsQuery.refetch()] : []),
      ]),
  };
}
