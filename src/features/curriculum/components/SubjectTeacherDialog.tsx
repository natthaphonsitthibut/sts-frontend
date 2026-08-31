import { useState } from "react";
import { Users } from "lucide-react";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormErrorAlert,
  MultiSelect,
} from "../../../components/base";
import type { CurriculumSubject } from "../types/curriculum.types";

interface SubjectTeacherDialogProps {
  /** The classroom being staffed, or null when the dialog is closed. */
  classroom: CurriculumSubject["classrooms"][number] | null;
  error: unknown;
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: {
    classroomSubjectIds: number[];
    teacherMembershipIds: number[];
  }) => void;
  subject: CurriculumSubject;
  teacherOptions: Array<{ value: string; label: string }>;
}

/**
 * Chooses who teaches one subject in one classroom.
 *
 * One room at a time, deliberately: two rooms of the same grade are routinely
 * taught by different teachers, and a control that overwrote the other rooms
 * from here would do it silently.
 */
export function SubjectTeacherDialog({
  classroom,
  error,
  isSaving,
  onClose,
  onSave,
  subject,
  teacherOptions,
}: SubjectTeacherDialogProps) {
  const [selected, setSelected] = useState<string[]>([]);
  // Adjust-state-during-render rather than an effect: reopening on another
  // classroom must start from that classroom's teachers, and an effect would
  // paint the previous selection for a frame first.
  const [openedFor, setOpenedFor] = useState<number | null>(null);
  const classroomSubjectId = classroom?.classroomSubjectId ?? null;
  if (classroomSubjectId !== openedFor) {
    setOpenedFor(classroomSubjectId);
    setSelected(
      (classroom?.teachers ?? []).map((teacher) =>
        String(teacher.membershipId),
      ),
    );
  }

  if (!classroom) return null;

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle icon={Users}>กำหนดครูผู้สอน</DialogTitle>
          <p className="mt-1 text-sm text-slate-500">
            {subject.subjectName} · {classroom.label}
          </p>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <FormErrorAlert error={error} fallback="บันทึกครูผู้สอนไม่สำเร็จ" />
          <MultiSelect
            ariaLabel="ครูผู้สอน"
            emptyText="ไม่พบครูในโรงเรียนนี้"
            onChange={setSelected}
            options={teacherOptions}
            placeholder="เลือกครูผู้สอน"
            value={selected}
          />
        </DialogBody>
        <DialogFooter>
          <Button disabled={isSaving} onClick={onClose} variant="outline">
            ยกเลิก
          </Button>
          <Button
            isLoading={isSaving}
            onClick={() =>
              onSave({
                classroomSubjectIds: [classroom.classroomSubjectId],
                teacherMembershipIds: selected.map(Number),
              })
            }
          >
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
