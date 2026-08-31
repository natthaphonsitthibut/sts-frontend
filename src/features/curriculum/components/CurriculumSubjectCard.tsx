import { useState } from "react";
import { ChevronDown, SquarePen, Trash2, Users } from "lucide-react";
import { Avatar, Button, IconButton } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { resolveApiMediaUrl } from "../../../lib/media-url";
import { cn } from "../../../lib/utils";
import type { CurriculumSubject } from "../types/curriculum.types";

interface CurriculumSubjectCardProps {
  subject: CurriculumSubject;
  isDeleting?: boolean;
  onEdit: (subject: CurriculumSubject) => void;
  onDelete: (subject: CurriculumSubject) => void;
  onAssignTeachers: (
    classroom: CurriculumSubject["classrooms"][number],
  ) => void;
  onOpenTeacher: (teacherId: string) => void;
}

/**
 * Teachers as a face and a name each, with the gap called out rather than left
 * blank: an unstaffed offering is the thing this screen exists to fix, and "-"
 * reads like a value.
 *
 * A subject can be taught by several people, so they wrap as separate chips
 * rather than running together as one comma list — at four or five names the
 * faces are what a reader scans, not the text.
 */
function TeacherCell({
  classroom,
  onOpenTeacher,
}: {
  classroom: CurriculumSubject["classrooms"][number];
  onOpenTeacher: (teacherId: string) => void;
}) {
  if (classroom.teachers.length === 0) {
    return (
      <span className="text-sm font-medium text-warning-700">
        ยังไม่กำหนดครู
      </span>
    );
  }
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {classroom.teachers.map((teacher) => (
        <li className="flex items-center gap-2" key={teacher.membershipId}>
          {/* The face opens the teacher's record, as it does on the teacher
              directory and the link page — same ring on hover and focus, so a
              reader learns the affordance once. */}
          <button
            aria-label={`เปิดข้อมูลคุณครู ${teacher.name}`}
            className="shrink-0 rounded-full transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => onOpenTeacher(teacher.teacherId)}
            type="button"
          >
            <Avatar
              className="size-8 text-xs"
              gradientName={teacher.name}
              imageAlt={`รูปประจำตัวของ ${teacher.name}`}
              imageUrl={resolveApiMediaUrl(teacher.photoUrl)}
            />
          </button>
          <span className="text-slate-800">{teacher.name}</span>
        </li>
      ))}
    </ul>
  );
}

export function CurriculumSubjectCard({
  subject,
  isDeleting,
  onEdit,
  onDelete,
  onAssignTeachers,
  onOpenTeacher,
}: CurriculumSubjectCardProps) {
  const [open, setOpen] = useState(false);
  const detailId = `curriculum-subject-${subject.id}`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-card">
      <button
        aria-controls={detailId}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 rounded-xl px-5 py-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="min-w-0">
          <span className="block truncate text-base font-bold text-slate-900">
            {subject.subjectName}
          </span>
          <span className="block truncate text-sm text-slate-500">
            {subject.subjectCode}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-5 shrink-0 text-slate-500 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="border-t border-slate-200 p-5" id={detailId}>
          {subject.classrooms.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              ยังไม่ได้เลือกห้องเรียนสำหรับรายวิชานี้
            </p>
          ) : (
            <>
              <DataTable
                columnWidths={["w-[22%]", "w-[58%]", "w-[20%]"]}
                headings={["ชั้น/ห้อง", "ครูผู้สอน", "เครื่องมือ"]}
                responsiveBreakpoint="md"
              >
                {subject.classrooms.map((classroom) => (
                  <DataTableRow key={classroom.id}>
                    <DataTableCell className="font-medium text-slate-800">
                      {classroom.label}
                    </DataTableCell>
                    <DataTableCell>
                      <TeacherCell
                        classroom={classroom}
                        onOpenTeacher={onOpenTeacher}
                      />
                    </DataTableCell>
                    <DataTableCell>
                      <Button
                        icon={Users}
                        onClick={() => onAssignTeachers(classroom)}
                        size="sm"
                        variant="outline"
                      >
                        กำหนดครู
                      </Button>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTable>
              <TableCardList desktopBreakpoint="md">
                {subject.classrooms.map((classroom) => (
                  <TableCard key={classroom.id}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-800">
                        {classroom.label}
                      </span>
                      <Button
                        icon={Users}
                        onClick={() => onAssignTeachers(classroom)}
                        size="sm"
                        variant="outline"
                      >
                        กำหนดครู
                      </Button>
                    </div>
                    <div className="mt-1 text-sm">
                      <TeacherCell
                        classroom={classroom}
                        onOpenTeacher={onOpenTeacher}
                      />
                    </div>
                  </TableCard>
                ))}
              </TableCardList>
            </>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button icon={SquarePen} onClick={() => onEdit(subject)}>
              แก้ไขข้อมูล
            </Button>
            <IconButton
              aria-busy={isDeleting}
              aria-label={`ลบรายวิชา ${subject.subjectName}`}
              disabled={isDeleting}
              icon={Trash2}
              onClick={() => onDelete(subject)}
              variant="delete"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
