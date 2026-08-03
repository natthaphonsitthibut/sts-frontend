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
export interface TeacherAssignmentDraft {
  key: string;
  teacherMembershipId: string;
  classroomIds: string[];
}

export function createTeacherAssignmentDraft(index: number): TeacherAssignmentDraft {
  return { key: `teacher-block-${index}`, teacherMembershipId: "", classroomIds: [] };
}
