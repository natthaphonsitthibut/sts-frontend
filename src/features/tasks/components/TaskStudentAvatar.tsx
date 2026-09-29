import { StudentAvatar } from "../../students/components/StudentAvatar";
import { useTaskLinkPhoto } from "../hooks/useTaskLinkPhoto";
import type { TaskAccessTask } from "../types/task.types";

interface TaskStudentAvatarProps {
  className?: string;
  sessionToken: string;
  task: TaskAccessTask;
}

/**
 * The student's photo on a follow-up form, looking the same as on the case
 * page; without one the letter avatar stays.
 */
export function TaskStudentAvatar({
  className,
  sessionToken,
  task,
}: TaskStudentAvatarProps) {
  const photoUrl = useTaskLinkPhoto(task.student_photo_url, sessionToken);
  return (
    <StudentAvatar
      className={className}
      name={task.student_name || "-"}
      photoUrl={photoUrl}
    />
  );
}
