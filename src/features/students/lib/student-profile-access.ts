/**
 * What `/students/:id` asks for, mirroring `app/router.tsx` and the API's
 * `GET /students/:id`. A link to a student's profile shows only when the
 * account holds one of these, so it never lands on /forbidden.
 */
export const STUDENT_PROFILE_PERMISSIONS = [
  "students",
  "manage-students",
  "classrooms",
] as const;

export function canOpenStudentProfile(
  can: (permissionId: string) => boolean,
): boolean {
  return STUDENT_PROFILE_PERMISSIONS.some((permissionId) => can(permissionId));
}
