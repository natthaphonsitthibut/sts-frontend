import { z } from "zod";

export const curriculumSubjectFormSchema = z.object({
  subjectCode: z.string().trim().min(1, "กรุณาระบุรหัสวิชา").max(20),
  subjectName: z.string().trim().min(1, "กรุณาระบุชื่อวิชา").max(255),
});

export type CurriculumSubjectFormValues = z.infer<typeof curriculumSubjectFormSchema>;

export const EMPTY_CURRICULUM_SUBJECT_FORM: CurriculumSubjectFormValues = {
  subjectCode: "",
  subjectName: "",
};

/** One "จัดสรรครูผู้สอน" block held outside RHF because it is list-shaped. */
/** One block of "these teachers cover these classrooms" — a subject can be
 * taught by several teachers in the same room, so both sides are lists. */
export interface TeacherAssignmentDraft {
  key: string;
  teacherMembershipIds: string[];
  classroomIds: string[];
}

export function createTeacherAssignmentDraft(index: number): TeacherAssignmentDraft {
  return { key: `teacher-block-${index}`, teacherMembershipIds: [], classroomIds: [] };
}
