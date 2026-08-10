import { useBlobObjectUrl } from "../../../hooks/useBlobObjectUrl";
import { StudentAvatar } from "../../students/components/StudentAvatar";
import { useTeacherStudentPhoto } from "../hooks/useTeacherAccess";
import { studentDisplayName } from "../lib/teacher-link-presentation";
import type { TeacherAccessRosterStudent } from "../types/teacher-access.types";

interface TeacherAccessStudentAvatarProps {
  assignmentId: number;
  student: TeacherAccessRosterStudent;
}

/** Teacher-link authentication lives in headers, so fetch the private image as a blob. */
export function TeacherAccessStudentAvatar({
  assignmentId,
  student,
}: TeacherAccessStudentAvatarProps) {
  const photoQuery = useTeacherStudentPhoto(
    assignmentId,
    student.studentUuid,
    student.hasPhoto,
  );
  const photoUrl = useBlobObjectUrl(photoQuery.data);

  return <StudentAvatar name={studentDisplayName(student)} photoUrl={photoUrl} />;
}
