import type { PaginatedSearchQuery } from "../../../lib/pagination";

export interface CurriculumGrade {
  gradeLevelId: number;
  gradeLabel: string;
  gradeCategory: string | null;
  subjectCount: number;
}

export interface CurriculumSubjectTeacher {
  membershipId: number;
  teacherId: string;
  name: string;
  /** App-served photo route, or null when the teacher has no photo set. */
  photoUrl: string | null;
}

export interface CurriculumClassroom {
  id: number;
  /** The offering row itself — what a teacher assignment hangs off. */
  classroomSubjectId: number;
  label: string;
  teachers: CurriculumSubjectTeacher[];
}

export interface CurriculumSubject {
  id: number;
  schoolId: number;
  gradeLevelId: number;
  gradeLabel: string;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  status: "ACTIVE" | "INACTIVE";
  classrooms: CurriculumClassroom[];
}

export interface CurriculumGradeQuery {
  schoolId: number;
  termId?: number;
  searchTerm?: string;
}

export interface CurriculumSubjectQuery extends PaginatedSearchQuery {
  schoolId: number;
  termId: number;
  gradeLevelId: number;
}

export interface CurriculumSubjectPayload {
  schoolId: number;
  termId: number;
  gradeLevelId: number;
  code: string;
  nameTh: string;
  classroomIds: number[];
}

export interface CurriculumSubjectTeachersPayload {
  schoolId: number;
  /** One classroom, or every classroom of the subject when staffing a grade. */
  classroomSubjectIds: number[];
  teacherMembershipIds: number[];
}
