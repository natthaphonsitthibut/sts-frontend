import { useQuery } from "@tanstack/react-query";
import {
  studentsService,
  type StudentReadSource,
} from "../api/students.service";

export const STUDENT_PROFILE_SUMMARY_QUERY_KEY = "student-profile-summary";

export function useStudentProfileSummary(
  studentId: string | undefined,
  source: StudentReadSource = "INTERNAL",
) {
  return useQuery({
    queryKey: [STUDENT_PROFILE_SUMMARY_QUERY_KEY, studentId, source],
    queryFn: () =>
      studentsService.getStudentProfileSummary(studentId as string, source),
    enabled: Boolean(studentId),
  });
}

export function useStudentSubjectAttendance(
  studentId: string | undefined,
  date: string | undefined,
  source: StudentReadSource = "INTERNAL",
) {
  return useQuery({
    queryKey: [
      STUDENT_PROFILE_SUMMARY_QUERY_KEY,
      studentId,
      "subjects",
      date,
      source,
    ],
    queryFn: () =>
      studentsService.getStudentSubjectAttendance(
        studentId as string,
        date as string,
        source,
      ),
    enabled: Boolean(studentId && date),
  });
}
