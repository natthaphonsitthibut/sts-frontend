import type { PaginatedSearchQuery } from "../../../lib/pagination";

/** Grade-level card on จัดการข้อมูลหลักสูตร. */
export interface CurriculumGrade {
  gradeLevelId: number;
  gradeLabel: string;
  gradeCategory: string | null;
  subjectCount: number;
}

/** One teacher and the classrooms they cover — a "จัดสรรครูผู้สอน" block. */
export interface CurriculumTeacherBlock {
  teacherMembershipId: string;
  teacherName: string;
  classrooms: Array<{ id: string; label: string }>;
}

/** Flat teacher × classroom row for the ห้องเรียน / ครูผู้สอน table. */
export interface CurriculumCoverage {
  id: string;
  teacherMembershipId: string;
  teacherName: string;
  classroomId: string;
  classroomLabel: string;
}

export interface CurriculumSubject {
  id: string;
  schoolId: number;
  schoolTermId: string;
  gradeLevelId: number;
  gradeLabel: string;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  contentFileName: string | null;
  contentFileSizeBytes: number | null;
  /** App-served URL; the endpoint redirects to a short-lived signed URL. */
  contentUrl: string | null;
  curriculumStatus: "ACTIVE" | "INACTIVE";
  teachers: CurriculumTeacherBlock[];
  coverage: CurriculumCoverage[];
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
  subjectCode: string;
  subjectName: string;
  teachers: Array<{ teacherMembershipId: number; classroomIds: number[] }>;
}
