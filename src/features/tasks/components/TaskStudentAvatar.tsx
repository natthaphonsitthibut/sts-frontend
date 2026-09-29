import { useQuery } from "@tanstack/react-query";
import { useBlobObjectUrl } from "../../../hooks/useBlobObjectUrl";
import { StudentAvatar } from "../../students/components/StudentAvatar";
import { taskService } from "../api/task.service";
import type { TaskAccessTask } from "../types/task.types";

interface TaskStudentAvatarProps {
  className?: string;
  sessionToken: string;
  task: TaskAccessTask;
}

/**
 * The student's photo on a follow-up form, looking the same as on the case
 * page. The link's session rides in a header, so the photo comes down as a
 * blob; without one the letter avatar stays.
 */
export function TaskStudentAvatar({
  className,
  sessionToken,
  task,
}: TaskStudentAvatarProps) {
  const photoUrl = task.student_photo_url ?? null;
  const photoQuery = useQuery({
    queryKey: ["task-student-photo", photoUrl, sessionToken],
    queryFn: () =>
      taskService.getStudentPhoto(photoUrl!, sessionToken || undefined),
    enabled: Boolean(photoUrl),
    retry: false,
    staleTime: Infinity,
  });
  const objectUrl = useBlobObjectUrl(photoQuery.data);

  return (
    <StudentAvatar
      className={className}
      name={task.student_name || "-"}
      photoUrl={objectUrl}
    />
  );
}
