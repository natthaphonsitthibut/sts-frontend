import { useMemo, useState } from "react";
import { Eye, SquarePen } from "lucide-react";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { Badge, Checkbox, IconButton } from "../../../components/base";
import { Pagination } from "../../../components/layout/pagination";
import { formatStudentRoom } from "../lib/student-presentation";
import { StudentAvatar } from "./StudentAvatar";
import type { StudentListItem } from "../types/students.types";

interface StudentTableProps {
  rows: StudentListItem[];
  totalCount: number;
  page: number;
  rowsPerPage: number;
  rowsPerPageOptions: readonly number[];
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onRowClick: (studentId: string) => void;
  management?: boolean;
  onEdit?: (studentId: string) => void;
  selectedIds?: ReadonlySet<string>;
  onSelectRow?: (student: StudentListItem, selected: boolean) => void;
  onSelectAll?: (
    students: readonly StudentListItem[],
    selected: boolean,
  ) => void;
}

function StudentIdentity({
  onOpen,
  student,
}: {
  /** When given, only the avatar opens the profile — the row itself stays inert. */
  onOpen?: () => void;
  student: StudentListItem;
}) {
  return (
    <div className="flex items-center gap-4">
      {onOpen ? (
        <button
          aria-label={`เปิดข้อมูลนักเรียน ${student.name}`}
          className="shrink-0 rounded-full transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={onOpen}
          type="button"
        >
          <StudentAvatar name={student.name} photoUrl={student.photo_url} />
        </button>
      ) : (
        <StudentAvatar name={student.name} photoUrl={student.photo_url} />
      )}
      <div className="min-w-0">
        <h3 className="truncate text-slate-800">{student.name}</h3>
      </div>
    </div>
  );
}

function compareText(a: string | undefined, b: string | undefined): number {
  return (a || "").localeCompare(b || "", "th");
}

function getStudentSortValue(student: StudentListItem, key: string): string {
  if (key === "name") return student.name;
  if (key === "school") return student.school_name || "";
  if (key === "grade") return student.grade || "";
  if (key === "room") return formatStudentRoom(student.room);
  if (key === "status") return student.student_status_label || "";
  return "";
}

export function StudentTable({
  rows,
  totalCount,
  page,
  rowsPerPage,
  rowsPerPageOptions,
  onPageChange,
  onRowsPerPageChange,
  onRowClick,
  management = false,
  onEdit,
  selectedIds,
  onSelectRow,
  onSelectAll,
}: StudentTableProps) {
  const baseIndex = (page - 1) * rowsPerPage;
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const selectable = Boolean(selectedIds && onSelectRow && onSelectAll);
  const sortedRows = useMemo(() => {
    const indexedRows = rows.map((student, index) => ({ student, index }));
    if (!sort) return indexedRows;
    if (sort.key === "sequence") {
      return sort.direction === "asc"
        ? indexedRows
        : [...indexedRows].reverse();
    }
    return indexedRows.sort((a, b) => {
      const result = compareText(
        getStudentSortValue(a.student, sort.key),
        getStudentSortValue(b.student, sort.key),
      );
      return sort.direction === "asc" ? result : -result;
    });
  }, [rows, sort]);
  const sortedStudents = sortedRows.map(({ student }) => student);
  const allSelected =
    selectable &&
    sortedStudents.length > 0 &&
    sortedStudents.every((student) => selectedIds?.has(student.id));

  return (
    <div className="flex flex-col gap-2">
      <DataTable
        headings={[
          ...(selectable
            ? [
                {
                  label: (
                    <Checkbox
                      aria-label="เลือกนักเรียนทั้งหมดในหน้านี้"
                      checked={allSelected}
                      onChange={(event) =>
                        onSelectAll?.(
                          sortedStudents,
                          event.currentTarget.checked,
                        )
                      }
                    />
                  ),
                  className: "w-[52px]",
                },
              ]
            : []),
          { label: "ลำดับ", sortKey: "sequence" },
          { label: "ชื่อ - นามสกุล", sortKey: "name" },
          { label: "โรงเรียน", sortKey: "school" },
          { label: "ชั้น", sortKey: "grade" },
          { label: "ห้อง", sortKey: "room" },
          { label: "สถานะ", sortKey: "status" },
          ...(management
            ? [{ label: "เครื่องมือ", className: "w-[112px]" }]
            : []),
        ]}
        minWidthClassName="min-w-[960px]"
        onSortChange={setSort}
        sort={sort}
      >
        {sortedRows.map(({ student, index }) => (
          <DataTableRow key={student.id}>
            {selectable ? (
              <DataTableCell>
                <Checkbox
                  aria-label={`เลือก ${student.name}`}
                  checked={selectedIds?.has(student.id) ?? false}
                  onChange={(event) => {
                    event.stopPropagation();
                    onSelectRow?.(student, event.currentTarget.checked);
                  }}
                  onClick={(event) => event.stopPropagation()}
                />
              </DataTableCell>
            ) : null}
            <DataTableCell className="text-slate-500">
              {baseIndex + index + 1}
            </DataTableCell>
            <DataTableCell>
              <StudentIdentity
                onOpen={() => onRowClick(student.id)}
                student={student}
              />
            </DataTableCell>
            <DataTableCell className="text-slate-600">
              {student.school_name || "-"}
            </DataTableCell>
            <DataTableCell className="text-slate-600">
              {student.grade || "-"}
            </DataTableCell>
            <DataTableCell className="text-slate-600">
              {formatStudentRoom(student.room)}
            </DataTableCell>
            <DataTableCell>
              <Badge
                variant={student.student_status_badge_variant ?? "secondary"}
              >
                {student.student_status_label || "ยังไม่ได้จับคู่"}
              </Badge>
            </DataTableCell>
            {management ? (
              <DataTableCell>
                <div className="flex items-center justify-end gap-1">
                  <IconButton
                    aria-label={`ดูข้อมูลของ ${student.name}`}
                    icon={Eye}
                    onClick={() => onRowClick(student.id)}
                    variant="view"
                  />
                  <IconButton
                    aria-label={`แก้ไขข้อมูลของ ${student.name}`}
                    icon={SquarePen}
                    onClick={() => onEdit?.(student.id)}
                    variant="edit"
                  />
                </div>
              </DataTableCell>
            ) : null}
          </DataTableRow>
        ))}
      </DataTable>

      <TableCardList>
        {sortedRows.map(({ student }) => (
          <TableCard key={student.id} className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              {selectable ? (
                <Checkbox
                  aria-label={`เลือก ${student.name}`}
                  checked={selectedIds?.has(student.id) ?? false}
                  onChange={(event) =>
                    onSelectRow?.(student, event.currentTarget.checked)
                  }
                />
              ) : null}
              <StudentIdentity
                onOpen={() => onRowClick(student.id)}
                student={student}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">
                {student.school_name || "-"}
              </span>
              <span className="text-slate-600">
                {student.grade || "-"} · {formatStudentRoom(student.room)}
              </span>
            </div>
            <Badge
              className="w-fit"
              variant={student.student_status_badge_variant ?? "secondary"}
            >
              {student.student_status_label || "ยังไม่ได้จับคู่"}
            </Badge>
            {management ? (
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <IconButton
                  aria-label={`ดูข้อมูลของ ${student.name}`}
                  icon={Eye}
                  onClick={() => onRowClick(student.id)}
                  variant="view"
                />
                <IconButton
                  aria-label={`แก้ไขข้อมูลของ ${student.name}`}
                  icon={SquarePen}
                  onClick={() => onEdit?.(student.id)}
                  variant="edit"
                />
              </div>
            ) : null}
          </TableCard>
        ))}
      </TableCardList>

      <Pagination
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={rowsPerPageOptions}
        totalCount={totalCount}
        unitLabel="คน"
      />
    </div>
  );
}
