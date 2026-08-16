import { useState } from "react";
import { ClipboardCheck, Link2Off, Share2 } from "lucide-react";
import { IconButton, useConfirm } from "../../../components/base";
import { formatThaiDate, formatThaiTime } from "../../../lib/date-time";
import { AttendanceDelegationEditDialog } from "./AttendanceDelegationEditDialog";
import type { TeacherAttendanceDelegation } from "../../teacher-access/types/teacher-access.types";

interface AttendanceDelegationSectionProps {
  delegations: readonly TeacherAttendanceDelegation[];
  onClose: (delegation: TeacherAttendanceDelegation) => Promise<void>;
  onShare: (delegation: TeacherAttendanceDelegation, accessUrl?: string) => void;
  onUpdate: (
    delegation: TeacherAttendanceDelegation,
    input: { endsOn: string; endsAt: string; teacherMembershipId: number },
  ) => Promise<{ accessUrl: string | null } | void>;
  teachers: readonly { teacherMembershipId: number; teacherDisplayName: string }[];
}

function delegationLabel(delegation: TeacherAttendanceDelegation): string {
  if (delegation.assignmentKind === "HOMEROOM") return "วิชาโฮมรูม";
  return `${delegation.subjectName ?? "รายวิชา"}${delegation.period ? ` · คาบ ${delegation.period}` : ""}`;
}

/** Existing, usable delegation links for the selected classroom and date. */
export function AttendanceDelegationSection({
  delegations,
  onClose,
  onShare,
  onUpdate,
  teachers,
}: AttendanceDelegationSectionProps) {
  const [editing, setEditing] = useState<TeacherAttendanceDelegation | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  if (delegations.length === 0) return null;

  async function close(delegation: TeacherAttendanceDelegation): Promise<void> {
    const accepted = await confirm({
      title: "ปิดลิงก์มอบหมายการเช็กชื่อ",
      description: `ลิงก์ของ ${delegation.teacherDisplayName} จะใช้งานไม่ได้ทันที`,
      confirmText: "ปิดลิงก์",
      variant: "destructive",
    });
    if (accepted) await onClose(delegation);
  }

  return (
    <>
      <section className="mb-5 rounded-lg border border-success/25 bg-success-50 px-4 py-3">
        <div className="flex items-center gap-2 text-slate-900">
          <ClipboardCheck className="size-4 text-success" aria-hidden="true" />
          <h2 className="text-base font-bold">ลิงก์มอบหมายการเช็กชื่อที่ยังใช้งาน</h2>
        </div>
        <div className="mt-2 divide-y divide-success/20">
          {delegations.map((delegation) => (
            <div className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-1 last:pb-0" key={delegation.grantId}>
              <div>
                <p className="font-medium text-slate-900">{delegation.teacherDisplayName} · {delegationLabel(delegation)}</p>
                <p className="mt-0.5 text-sm text-slate-600">
                  {formatThaiDate(delegation.attendanceDate)} · {formatThaiTime(delegation.startsAt)}–{formatThaiTime(delegation.endsAt)} น.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <IconButton aria-label={`แก้ไขลิงก์ของ ${delegation.teacherDisplayName}`} icon={ClipboardCheck} iconClassName="size-5" onClick={() => setEditing(delegation)} variant="edit" />
                <IconButton aria-label={`แชร์ลิงก์ของ ${delegation.teacherDisplayName}`} icon={Share2} iconClassName="size-5" onClick={() => onShare(delegation)} variant="share" />
                <IconButton aria-label={`ปิดลิงก์ของ ${delegation.teacherDisplayName}`} icon={Link2Off} iconClassName="size-5" onClick={() => void close(delegation)} variant="lock" />
              </div>
            </div>
          ))}
        </div>
      </section>
      {confirmDialog}
      {/* Saving and handing the link over are one action — the same dialog the
          history tables open, so every delegation is edited the same way. */}
      <AttendanceDelegationEditDialog
        delegation={editing}
        onClose={() => setEditing(null)}
        onSaveAndShare={async (_delegation, input) => {
          if (!editing) return;
          const result = await onUpdate(editing, input);
          onShare(editing, result?.accessUrl ?? undefined);
        }}
        teachers={teachers}
      />
    </>
  );
}
