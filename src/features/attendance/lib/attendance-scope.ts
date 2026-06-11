import type { DataScope } from "../../auth/lib/permissions";

/**
 * A scope dimension is "locked" when the user is constrained to exactly one
 * value for it (mirrors Quasar's useDataScopeLock). A locked teacher therefore
 * can only check their own school/grade/room — the pickers render disabled and
 * pre-filled.
 */
export interface AttendanceScopeLock {
  lockedSchoolId: number | null;
  lockedGradeLevelId: number | null;
  lockedRoom: string | null;
  isSchoolLocked: boolean;
  isGradeLocked: boolean;
  isRoomLocked: boolean;
}

function single<T>(values: T[] | undefined): T | null {
  return values && values.length === 1 ? values[0]! : null;
}

export function resolveAttendanceScopeLock(
  scope: DataScope | undefined,
): AttendanceScopeLock {
  const lockedSchoolId = single(scope?.school_ids);
  const lockedGradeLevelId = single(scope?.grade_levels);
  const lockedRoomRaw = single(scope?.room_ids);

  return {
    lockedSchoolId,
    lockedGradeLevelId,
    lockedRoom: lockedRoomRaw == null ? null : String(lockedRoomRaw),
    isSchoolLocked: lockedSchoolId != null,
    isGradeLocked: lockedGradeLevelId != null,
    isRoomLocked: lockedRoomRaw != null,
  };
}
