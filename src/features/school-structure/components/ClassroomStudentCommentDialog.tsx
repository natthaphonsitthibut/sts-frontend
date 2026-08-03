import { MessageSquareText } from "lucide-react";
import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormErrorAlert,
  Textarea,
} from "../../../components/base";
import { StudentAvatar } from "../../students/components/StudentAvatar";
import { useCreateClassroomStudentComment } from "../hooks/useSchoolStructure";
import type { ClassroomRosterStudent } from "../types/school-structure.types";

interface ClassroomStudentCommentDialogProps {
  classroomId: number;
  /** Only the identity fields are rendered, so link rosters fit as well. */
  student: Pick<
    ClassroomRosterStudent,
    "studentUuid" | "firstName" | "lastName" | "studentNumber"
  > | null;
  onOpenChange: (open: boolean) => void;
  /**
   * Replaces the authenticated write. Teacher links post through their own
   * grant-scoped endpoint instead of the school-structure API.
   */
  submitComment?: (input: {
    classroomId: number;
    studentUuid: string;
    commentText: string;
  }) => Promise<unknown>;
  isSubmitting?: boolean;
  submitError?: unknown;
}

export function ClassroomStudentCommentDialog({
  classroomId,
  isSubmitting,
  onOpenChange,
  student,
  submitComment,
  submitError,
}: ClassroomStudentCommentDialogProps) {
  const [commentText, setCommentText] = useState("");
  const mutation = useCreateClassroomStudentComment();
  const open = Boolean(student);

  if (!student) return null;

  const fullName = `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() || "-";

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      setCommentText("");
      mutation.reset();
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(): Promise<void> {
    const normalizedComment = commentText.trim();
    if (!normalizedComment) return;
    const payload = {
      classroomId,
      studentUuid: student!.studentUuid,
      commentText: normalizedComment,
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
      <DialogContent className="max-w-xl" onClose={() => handleOpenChange(false)}>
        <DialogHeader>
          <DialogTitle icon={MessageSquareText}>ความคิดเห็น</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4">
          <StudentAvatar name={fullName} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{fullName}</p>
            <p className="mt-0.5 text-sm text-slate-600">
              รหัสประจำตัว: {student.studentNumber ?? "-"}
            </p>
          </div>
        </div>

        <label className="mt-5 block text-sm font-semibold text-slate-900" htmlFor="classroom-student-comment">
          ความคิดเห็น
        </label>
        <Textarea
          className="mt-2 min-h-48 resize-y"
          id="classroom-student-comment"
          maxLength={2000}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder="คำอธิบาย"
          value={commentText}
        />
        <p className="mt-1 text-right text-xs text-slate-500">{commentText.length}/2000</p>

        <FormErrorAlert
          className="mt-4"
          error={submitComment ? submitError : mutation.error}
          fallback="ไม่สามารถบันทึกความคิดเห็นได้"
        />

        <DialogFooter className="grid grid-cols-2 sm:grid">
          <Button fullWidth onClick={() => handleOpenChange(false)} variant="secondary">ยกเลิก</Button>
          <Button
            disabled={!commentText.trim()}
            fullWidth
            isLoading={submitComment ? Boolean(isSubmitting) : mutation.isPending}
            loadingText="กำลังบันทึก"
            onClick={() => void handleSubmit()}
          >
            บันทึกข้อมูล
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
