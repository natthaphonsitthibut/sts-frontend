export type StructureStatus = "ACTIVE" | "INACTIVE";

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
  homeroomTeacherName: string | null;
  studentCount: number;
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
  teacherUserId: number;
  username: string;
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
  teacherUserId: number;
  teacherName: string;
  subjectId: number | null;
  subjectCode: string | null;
  subjectName: string | null;
  assignmentKind: "HOMEROOM" | "SUBJECT";
  assignmentStatus: StructureStatus;
  effectiveOn: string | null;
  effectiveUntil: string | null;
}

export interface ClassroomRosterStudent {
  studentUuid: string;
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

export interface CreateClassroomInput {
  schoolTermId: number;
  gradeLevelId: number;
  roomCode: string;
  roomName?: string;
  legacyRoomNumber: number;
}

export interface UpdateClassroomInput {
  classroomId: string;
  gradeLevelId?: number;
  roomCode?: string;
  roomName?: string;
  legacyRoomNumber?: number;
}
