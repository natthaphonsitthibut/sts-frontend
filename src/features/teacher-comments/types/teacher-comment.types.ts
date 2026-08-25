/** How worried the teacher was when they wrote the comment. */
export type CommentConcernLevel = "NOTE" | "WATCH" | "CONCERN";

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

/** One row of หน้าความคิดเห็นจากคุณครู. */
export interface TeacherCommentReport {
  id: string;
  studentUuid: string;
  studentName: string;
  schoolName: string | null;
  gradeLabel: string | null;
  roomNo: string | null;
  problemCategory: string;
  problemCategoryLabel: string;
  problemCategoryGuidance: string | null;
  problemDescription: string;
  concernLevelCode: CommentConcernLevel;
  concernLevelLabel: string;
  authorDisplayName: string;
  commentedAt: string;
}
