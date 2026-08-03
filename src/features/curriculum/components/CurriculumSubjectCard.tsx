import { useMemo, useState } from "react";
import { ChevronDown, FileText, SquarePen, Trash2 } from "lucide-react";
import { Button, IconButton } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import { Pagination } from "../../../components/layout/pagination";
import { PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { formatFileSize } from "../../../lib/file-size";
import { resolveApiMediaUrl } from "../../../lib/media-url";
import { cn } from "../../../lib/utils";
import type { CurriculumCoverage, CurriculumSubject } from "../types/curriculum.types";

interface CurriculumSubjectCardProps {
  subject: CurriculumSubject;
  onEdit: (subject: CurriculumSubject) => void;
  onDelete: (subject: CurriculumSubject) => void;
  isDeleting?: boolean;
}

function getCoverageSortValue(row: CurriculumCoverage, key: string): string {
  if (key === "classroom") return row.classroomLabel;
  if (key === "teacher") return row.teacherName;
  return "";
}

/**
 * One subject in the grade's curriculum, collapsed to code + name and expanding
 * to the classroom/teacher coverage plus its learning-content PDF.
 */
export function CurriculumSubjectCard({
  subject,
  onEdit,
  onDelete,
  isDeleting,
}: CurriculumSubjectCardProps) {
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  // Coverage arrives with the subject, so paging and sorting stay client-side.
  const sortedCoverage = useMemo(() => {
    if (!sort) return subject.coverage;
    return [...subject.coverage].sort((a, b) => {
      const result = getCoverageSortValue(a, sort.key).localeCompare(
        getCoverageSortValue(b, sort.key),
        "th",
      );
      return sort.direction === "asc" ? result : -result;
    });
  }, [sort, subject.coverage]);
  const pagedCoverage = sortedCoverage.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage,
  );
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
            {subject.subjectCode}
          </span>
          <span className="block truncate text-sm text-slate-600">
            {subject.subjectName}
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
          {subject.coverage.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              ยังไม่ได้จัดสรรครูผู้สอนและห้องเรียนสำหรับรายวิชานี้
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <DataTable
                columnWidths={["w-1/2", "w-1/2"]}
                headings={[
                  { label: "ห้องเรียน", sortKey: "classroom" },
                  { label: "ครูผู้สอน", sortKey: "teacher" },
                ]}
                minWidthClassName="min-w-[480px]"
                onSortChange={(next) => {
                  setSort(next);
                  setPage(1);
                }}
                responsive={false}
                sort={sort}
              >
                {pagedCoverage.map((row) => (
                  <DataTableRow key={row.id}>
                    <DataTableCell className="text-center font-semibold text-slate-800">
                      {row.classroomLabel}
                    </DataTableCell>
                    <DataTableCell className="text-center font-semibold text-slate-800">
                      {row.teacherName}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTable>
              <Pagination
                onPageChange={setPage}
                onRowsPerPageChange={(value) => {
                  setRowsPerPage(value);
                  setPage(1);
                }}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                totalCount={sortedCoverage.length}
                unitLabel="รายการ"
              />
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="shrink-0 font-semibold text-slate-700">
                เนื้อหาสาระการเรียนรู้:
              </span>
              {subject.contentUrl ? (
                <a
                  className="inline-flex min-w-0 items-center gap-2 rounded-md border border-slate-200 px-2 py-1 text-slate-700 transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  href={resolveApiMediaUrl(subject.contentUrl) ?? undefined}
                  rel="noreferrer"
                  target="_blank"
                >
                  <FileText className="size-4 shrink-0 text-danger" aria-hidden="true" />
                  <span className="truncate">{subject.contentFileName}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {formatFileSize(subject.contentFileSizeBytes)}
                  </span>
                </a>
              ) : (
                <span className="text-slate-500">ยังไม่มีไฟล์</span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:justify-end">
              <Button icon={SquarePen} onClick={() => onEdit(subject)}>
                แก้ไขข้อมูล
              </Button>
              <IconButton
                aria-busy={isDeleting}
                aria-label={`ลบรายวิชา ${subject.subjectCode}`}
                disabled={isDeleting}
                icon={Trash2}
                onClick={() => onDelete(subject)}
                variant="delete"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
