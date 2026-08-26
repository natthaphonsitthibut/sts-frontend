export type StructureStatus = "ACTIVE" | "INACTIVE";
export type ClassroomCardCoverColor = `#${string}`;

export const CLASSROOM_STUDENT_PROBLEM_CATEGORIES = [
  "HEALTH",
  "SOCIAL_INTEGRATION",
  "ACADEMIC",
  "EMOTIONAL",
  "FINANCIAL",
  "ATTENDANCE",
  "FAMILY_CARE",
  "SAFETY",
  "OTHER",
] as const;

export type ClassroomStudentProblemCategory =
  (typeof CLASSROOM_STUDENT_PROBLEM_CATEGORIES)[number];

export interface ClassroomStudentProblemCategoryOption {
  code: ClassroomStudentProblemCategory;
  label: string;
  guidance: string | null;
}

export const CLASSROOM_STUDENT_COMMENT_CONCERN_LEVELS = [
  "NOTE",
  "WATCH",
  "CONCERN",
] as const;

export type ClassroomStudentCommentConcernLevel =
  (typeof CLASSROOM_STUDENT_COMMENT_CONCERN_LEVELS)[number];

export interface ClassroomStudentCommentConcernLevelOption {
  code: ClassroomStudentCommentConcernLevel;
  label: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface ScopedSchool {
  id: number;
  name: string;
  province: string | null;
  district: string | null;
  subDistrict: string | null;
}

export interface SchoolClassroom {
  id: string;
  schoolTermId: string;
  schoolId: number;
  academicYear: number;
  semester: number;
  gradeLevelId: number;
  gradeLabel: string;
  legacyRoomNumber: number | null;
  roomCode: string;
  roomName: string | null;
  classroomStatus: StructureStatus;
  cardCoverColor: ClassroomCardCoverColor;
  coverImageUrl: string | null;
  coverImagePositionX: number;
  coverImagePositionY: number;
  coverImageScale: number;
  isFavorite: boolean;
  homeroomTeacherName: string | null;
  homeroomTeachers: Array<{
    teacherMembershipId: string;
    teacherId: string;
    teacherName: string;
    isPrimary: boolean;
  }>;
  studentCount: number;
}

export interface UpdateClassroomPresentationInput {
  classroomId: string;
  cardCoverColor: ClassroomCardCoverColor;
  coverImagePositionX: number;
  coverImagePositionY: number;
  coverImageScale: number;
  file?: File;
  removeCover?: boolean;
}

export interface SchoolClassroomOption {
  id: string;
  gradeLevelId: number;
  gradeLabel: string;
  roomCode: string;
  roomName: string | null;
}

export interface PaginatedSchoolClassrooms {
  data: SchoolClassroom[];
  meta: PaginationMeta;
  summary: {
    classroomCount: number;
    teacherCount: number;
    studentCount: number;
  };
}

export interface SchoolTeacherMembership {
  id: string;
  schoolId: number;
  teacherId: string;
  displayName: string;
  membershipStatus: StructureStatus;
  startedOn: string;
  endedOn: string | null;
}

export interface PaginatedSchoolTeachers {
  data: SchoolTeacherMembership[];
  meta: PaginationMeta;
  summary: { activeCount: number };
}

export interface ClassroomTeacherAssignment {
  id: string;
  schoolId: number;
  classroomId: string;
  teacherMembershipId: string;
  teacherId: string;
  teacherName: string;
  subjectId: number | null;
  subjectCode: string | null;
  subjectName: string | null;
  assignmentKind: "HOMEROOM" | "SUBJECT";
  assignmentStatus: StructureStatus;
  isPrimary: boolean;
  effectiveOn: string | null;
  effectiveUntil: string | null;
}

export interface ClassroomRosterStudent {
  studentUuid: string;
  studentNumber: string | null;
  photoUrl: string | null;
  riskTier: string;
  riskSeverity: number;
  teacherComment: string | null;
  firstName: string | null;
  lastName: string | null;
  studentStatusCode: number | null;
  studentStatusLabel: string | null;
  studentStatusBadgeVariant:
    | "default"
    | "secondary"
    | "destructive"
    | "success"
    | "warning"
    | null;
  classroomId: string;
  gradeLabel: string;
  roomCode: string;
}

export interface PaginatedClassroomRoster {
  data: ClassroomRosterStudent[];
  meta: PaginationMeta;
}

export interface ClassroomStudentCommentResult {
  id: string;
  studentUuid: string;
  problemCategory: ClassroomStudentProblemCategory;
  problemCategoryLabel: string;
  problemCategoryGuidance: string | null;
  concernLevelCode: ClassroomStudentCommentConcernLevel;
  concernLevelLabel: string;
  problemDescription: string;
  createdAt: string;
}

export interface StudentClassroomComment {
  id: string;
  studentTermId: string;
  problemCategory: ClassroomStudentProblemCategory;
  problemCategoryLabel: string;
  problemCategoryGuidance: string | null;
  concernLevelCode: ClassroomStudentCommentConcernLevel;
  concernLevelLabel: string;
  problemDescription: string;
  authorDisplayName: string;
  commentedAt: string;
}

export interface StudentClassroomCommentsResponse {
  data: StudentClassroomComment[];
  meta: { totalCount: number };
}

export interface ClassroomDailyAttendance {
  date: string;
  recordedBy: string;
  presentCount: number;
  lateCount: number;
  leaveCount: number;
  absentCount: number;
}

export interface ClassroomStudentAttendanceSummary {
  studentUuid: string;
  studentNumber: string | null;
  photoUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  presentCount: number;
  lateCount: number;
  leaveCount: number;
  absentCount: number;
}

export interface ClassroomStudentAttendanceDay {
  id: string;
  date: string;
  time: string | null;
  recordedBy: string;
  status: "P_PRESENT" | "P_LATE" | "P_LEAVE" | "P_ABSENT" | "NONE";
}

export interface PaginatedClassroomDailyAttendance {
  data: ClassroomDailyAttendance[];
  meta: PaginationMeta;
}

export interface PaginatedClassroomStudentAttendance {
  data: ClassroomStudentAttendanceSummary[];
  meta: PaginationMeta;
}

export interface PaginatedClassroomStudentAttendanceDays {
  data: ClassroomStudentAttendanceDay[];
  meta: PaginationMeta;
}

export interface CreateClassroomInput {
  schoolTermId: number;
  gradeLevelId: number;
  roomCode: string;
  roomName?: string;
}

export interface UpdateClassroomInput {
  classroomId: string;
  gradeLevelId?: number;
  roomCode?: string;
  roomName?: string;
}
