import { MessageSquareText } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  Textarea,
  registerField,
} from "../../../components/base";
import { StudentAvatar } from "../../students/components/StudentAvatar";
import {
  useCreateClassroomStudentComment,
  useStudentCommentConcernLevels,
  useStudentProblemCategories,
} from "../hooks/useSchoolStructure";
import {
  classroomStudentCommentFormSchema,
  formatProblemCategoryOption,
  type ClassroomStudentCommentFormValues,
} from "../lib/classroom-student-comment-form";
import type {
  ClassroomRosterStudent,
  ClassroomStudentCommentConcernLevelOption,
  ClassroomStudentProblemCategoryOption,
} from "../types/school-structure.types";

interface ClassroomStudentCommentDialogProps {
  classroomId: number;
  /** Only the identity fields are rendered, so link rosters fit as well. */
  student:
    | (Pick<
        ClassroomRosterStudent,
        "studentUuid" | "firstName" | "lastName" | "studentNumber"
      > & { photoUrl?: string | null })
    | null;
  onOpenChange: (open: boolean) => void;
  problemCategories?: ClassroomStudentProblemCategoryOption[];
  concernLevels?: ClassroomStudentCommentConcernLevelOption[];
  /**
   * Replaces the authenticated write. Teacher links post through their own
   * grant-scoped endpoint instead of the school-structure API.
   */
  submitComment?: (input: {
    classroomId: number;
    studentUuid: string;
    problemCategory: ClassroomStudentCommentFormValues["problemCategory"];
    concernLevelCode: ClassroomStudentCommentFormValues["concernLevelCode"];
    problemDescription: string;
  }) => Promise<unknown>;
  isSubmitting?: boolean;
  submitError?: unknown;
}

export function ClassroomStudentCommentDialog({
  classroomId,
  concernLevels: providedConcernLevels,
  isSubmitting,
  onOpenChange,
  problemCategories: providedProblemCategories,
  student,
  submitComment,
  submitError,
}: ClassroomStudentCommentDialogProps) {
  const mutation = useCreateClassroomStudentComment();
  const problemCategoriesQuery = useStudentProblemCategories(
    providedProblemCategories === undefined,
  );
  const concernLevelsQuery = useStudentCommentConcernLevels(
    providedConcernLevels === undefined,
  );
  const problemCategories =
    providedProblemCategories ?? problemCategoriesQuery.data ?? [];
  const concernLevels = providedConcernLevels ?? concernLevelsQuery.data ?? [];
  const form = useForm<ClassroomStudentCommentFormValues>({
    defaultValues: { concernLevelCode: "NOTE", problemDescription: "" },
    resolver: zodResolver(classroomStudentCommentFormSchema),
  });
  const selectedProblemCategory = useWatch({
    control: form.control,
    name: "problemCategory",
  });
  const selectedConcernLevel = useWatch({
    control: form.control,
    name: "concernLevelCode",
  });
  const problemDescription = useWatch({
    control: form.control,
    name: "problemDescription",
  });
  const open = Boolean(student);

  if (!student) return null;

  const fullName =
    `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() || "-";

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      form.reset({ concernLevelCode: "NOTE", problemDescription: "" });
      mutation.reset();
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(
    values: ClassroomStudentCommentFormValues,
  ): Promise<void> {
    const payload = {
      classroomId,
      studentUuid: student!.studentUuid,
      problemCategory: values.problemCategory,
      concernLevelCode: values.concernLevelCode,
      problemDescription: values.problemDescription,
    };
    if (submitComment) {
      await submitComment(payload);
    } else {
      await mutation.mutateAsync(payload);
    }
    handleOpenChange(false);
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="max-w-xl"
        onClose={() => handleOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle icon={MessageSquareText}>ความคิดเห็น</DialogTitle>
        </DialogHeader>

        <Form form={form} onSubmit={handleSubmit}>
          <DialogBody>
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4">
              <StudentAvatar name={fullName} photoUrl={student.photoUrl} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">
                  {fullName}
                </p>
                <p className="mt-0.5 text-sm text-slate-600">
                  รหัสประจำตัว: {student.studentNumber ?? "-"}
                </p>
              </div>
            </div>

            <FormItem className="mt-5">
              <FormLabel htmlFor="classroom-student-problem-category" required>
                หัวข้อปัญหา
              </FormLabel>
              <Select
                disabled={
                  problemCategoriesQuery.isLoading ||
                  problemCategories.length === 0
                }
                id="classroom-student-problem-category"
                {...registerField(form, "problemCategory")}
              >
                <option value="">
                  {problemCategoriesQuery.isLoading
                    ? "กำลังโหลดหัวข้อปัญหา..."
                    : "หัวข้อปัญหา"}
                </option>
                {problemCategories.map((option) => (
                  <option key={option.code} value={option.code}>
                    {formatProblemCategoryOption(option)}
                  </option>
                ))}
              </Select>
              <FormMessage<ClassroomStudentCommentFormValues> name="problemCategory" />
              {problemCategoriesQuery.isError ? (
                <p className="text-sm text-destructive">
                  โหลดหัวข้อปัญหาไม่สำเร็จ กรุณาปิดแล้วเปิดแบบฟอร์มอีกครั้ง
                </p>
              ) : null}
            </FormItem>

            <FormItem>
              <FormLabel
                htmlFor="classroom-student-comment-concern-level"
                required
              >
                ระดับข้อสังเกต
              </FormLabel>
              <Select
                disabled={
                  concernLevelsQuery.isLoading || concernLevels.length === 0
                }
                id="classroom-student-comment-concern-level"
                {...registerField(form, "concernLevelCode")}
              >
                {concernLevels.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <p className="text-sm text-slate-500">
                บันทึกทั่วไปจะอยู่ในประวัติ
                แต่ไม่เพิ่มนักเรียนเข้ากลุ่มเฝ้าระวัง
              </p>
              <FormMessage<ClassroomStudentCommentFormValues> name="concernLevelCode" />
              {concernLevelsQuery.isError ? (
                <p className="text-sm text-destructive">
                  โหลดระดับข้อสังเกตไม่สำเร็จ กรุณาปิดแล้วเปิดแบบฟอร์มอีกครั้ง
                </p>
              ) : null}
            </FormItem>

            <FormItem>
              <FormLabel
                htmlFor="classroom-student-problem-description"
                required
              >
                คำอธิบาย
              </FormLabel>
              <Textarea
                className="min-h-48 resize-y"
                id="classroom-student-problem-description"
                maxLength={2000}
                placeholder="คำอธิบาย"
                {...registerField(form, "problemDescription")}
              />
              <div className="flex items-start justify-between gap-3">
                <FormMessage<ClassroomStudentCommentFormValues> name="problemDescription" />
                <p className="shrink-0 text-xs text-slate-500">
                  {problemDescription.length}/2000
                </p>
              </div>
            </FormItem>

            <FormErrorAlert
              className="mt-4"
              error={submitComment ? submitError : mutation.error}
              fallback="ไม่สามารถบันทึกคำอธิบายได้"
            />
          </DialogBody>

          <DialogFooter className="grid grid-cols-2 sm:grid">
            <Button
              fullWidth
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="secondary"
            >
              ยกเลิก
            </Button>
            <Button
              disabled={
                !selectedProblemCategory ||
                !selectedConcernLevel ||
                !problemDescription.trim() ||
                problemCategories.length === 0 ||
                concernLevels.length === 0
              }
              fullWidth
              isLoading={
                submitComment ? Boolean(isSubmitting) : mutation.isPending
              }
              loadingText="กำลังบันทึก"
              type="submit"
            >
              บันทึกข้อมูล
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
