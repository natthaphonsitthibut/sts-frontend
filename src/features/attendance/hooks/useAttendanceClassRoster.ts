import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { attendanceService } from "../api/attendance.service";
import type {
  AttendanceStudent,
  AttendanceTask,
} from "../types/attendance.types";

export const ATTENDANCE_TASKS_QUERY_KEY = "attendance-tasks";
export const ATTENDANCE_STUDENTS_QUERY_KEY = "attendance-students";

const EMPTY_STUDENTS: AttendanceStudent[] = [];

interface UseAttendanceClassRosterResult {
  task: AttendanceTask | undefined;
  students: AttendanceStudent[];
  isLoading: boolean;
  isError: boolean;
  notFound: boolean;
}

/**
 * Resolves a class (attendance task) by id and loads its student roster.
 * Shares the cached task list with the dashboard overview.
 */
export function useAttendanceClassRoster(
  classId: string | undefined,
): UseAttendanceClassRosterResult {
  const tasksQuery = useQuery({
    queryKey: [ATTENDANCE_TASKS_QUERY_KEY],
    queryFn: attendanceService.getTasks,
  });

  const task = useMemo(
    () => tasksQuery.data?.find((item) => item.task_id === classId),
    [tasksQuery.data, classId],
  );

  const studentsQuery = useQuery({
    queryKey: [ATTENDANCE_STUDENTS_QUERY_KEY, task?.task_id],
    queryFn: () =>
      attendanceService.getStudents({
        grade: task!.target_grade,
        room: task!.target_room,
        schoolId: task!.target_school_id ?? "",
      }),
    enabled: Boolean(task),
  });

  return {
    task,
    students: studentsQuery.data ?? EMPTY_STUDENTS,
    isLoading: tasksQuery.isLoading || (Boolean(task) && studentsQuery.isLoading),
    isError: tasksQuery.isError || studentsQuery.isError,
    notFound: !tasksQuery.isLoading && !tasksQuery.isError && !task,
  };
}
