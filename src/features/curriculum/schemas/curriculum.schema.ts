import { z } from "zod";

export const curriculumSubjectFormSchema = z.object({
  subjectCode: z.string().trim().min(1, "กรุณาระบุรหัสวิชา").max(20),
  subjectName: z.string().trim().min(1, "กรุณาระบุชื่อวิชา").max(200),
});

export type CurriculumSubjectFormValues = z.infer<
  typeof curriculumSubjectFormSchema
>;

export const EMPTY_CURRICULUM_SUBJECT_FORM: CurriculumSubjectFormValues = {
  subjectCode: "",
  subjectName: "",
};
