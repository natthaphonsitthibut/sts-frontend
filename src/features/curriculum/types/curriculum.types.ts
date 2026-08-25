import type { PaginatedSearchQuery } from "../../../lib/pagination";

export interface CurriculumGrade {
  gradeLevelId: number;
  gradeLabel: string;
  gradeCategory: string | null;
  subjectCount: number;
}

export interface CurriculumClassroom {
  id: number;
  label: string;
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
