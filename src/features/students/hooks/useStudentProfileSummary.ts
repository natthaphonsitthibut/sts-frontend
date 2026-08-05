import { useQuery } from "@tanstack/react-query";
import { studentsService } from "../api/students.service";

export const STUDENT_PROFILE_SUMMARY_QUERY_KEY = "student-profile-summary";

export function useStudentProfileSummary(studentId: string | undefined) {
  return useQuery({
    queryKey: [STUDENT_PROFILE_SUMMARY_QUERY_KEY, studentId],
    queryFn: () => studentsService.getStudentProfileSummary(studentId as string),
    enabled: Boolean(studentId),
  });
}

export function useStudentSubjectAttendance(
  studentId: string | undefined,
  date: string | undefined,
) {
  return useQuery({
    queryKey: [STUDENT_PROFILE_SUMMARY_QUERY_KEY, studentId, "subjects", date],
    queryFn: () =>
      studentsService.getStudentSubjectAttendance(studentId as string, date as string),
    enabled: Boolean(studentId && date),
  });
}
