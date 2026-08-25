import { useQuery } from "@tanstack/react-query";
import { teacherCommentsService } from "../api/teacher-comments.service";

const KEY = "teacher-comments";

export function useTeacherComments(query: {
  page?: number;
  limit?: number;
  searchTerm?: string;
}) {
  return useQuery({
    queryKey: [KEY, "report", query],
    queryFn: () => teacherCommentsService.listTeacherComments(query),
  });
}
