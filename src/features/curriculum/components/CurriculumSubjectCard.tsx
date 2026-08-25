import { useState } from "react";
import { ChevronDown, SquarePen, Trash2 } from "lucide-react";
import { Button, IconButton } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { cn } from "../../../lib/utils";
import type { CurriculumSubject } from "../types/curriculum.types";

interface CurriculumSubjectCardProps {
  subject: CurriculumSubject;
  isDeleting?: boolean;
  onEdit: (subject: CurriculumSubject) => void;
  onDelete: (subject: CurriculumSubject) => void;
}

export function CurriculumSubjectCard({
  subject,
  isDeleting,
  onEdit,
  onDelete,
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
              <DataTable headings={["ชั้น/ห้อง"]} responsiveBreakpoint="md">
                {subject.classrooms.map((classroom) => (
                  <DataTableRow key={classroom.id}>
                    <DataTableCell className="font-medium text-slate-800">
                      {classroom.label}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTable>
              <TableCardList desktopBreakpoint="md">
                {subject.classrooms.map((classroom) => (
                  <TableCard key={classroom.id}>
                    <span className="font-semibold text-slate-800">
                      {classroom.label}
                    </span>
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
