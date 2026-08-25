import { apiClient } from "../../../lib/api-client";
import type {
  PaginationMeta,
  TeacherCommentReport,
} from "../types/teacher-comment.types";

interface PaginatedEnvelope<T> {
  data: T[];
  meta: PaginationMeta;
}

async function listTeacherComments(query: {
  page?: number;
  limit?: number;
  searchTerm?: string;
}): Promise<PaginatedEnvelope<TeacherCommentReport>> {
  const response = await apiClient.get<PaginatedEnvelope<TeacherCommentReport>>(
    "/student-risk-report/teacher-comments",
    { params: query },
  );
  return response.data;
}

export const teacherCommentsService = {
  listTeacherComments,
};
