import { useMemo, useState } from "react";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { Badge } from "../../../components/base";
import { Pagination } from "../../../components/layout/pagination";
import {
  formatStudentRoom,
  getStudentAvatarGradient,
} from "../lib/student-presentation";
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
}

function StudentAvatar({ name }: { name: string }) {
  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
      style={getStudentAvatarGradient(name)}
    >
      {name?.[0] || "?"}
    </div>
  );
}

function StudentIdentity({ student }: { student: StudentListItem }) {
  return (
    <div className="flex items-center gap-4">
      <StudentAvatar name={student.name} />
      <div className="min-w-0">
        <h3 className="truncate font-bold text-slate-800">
          {student.name}
        </h3>
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
}: StudentTableProps) {
  const baseIndex = (page - 1) * rowsPerPage;
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const sortedRows = useMemo(() => {
    const indexedRows = rows.map((student, index) => ({ student, index }));
    if (!sort) return indexedRows;
    if (sort.key === "sequence") {
      return sort.direction === "asc" ? indexedRows : [...indexedRows].reverse();
    }
    return indexedRows.sort((a, b) => {
      const result = compareText(
        getStudentSortValue(a.student, sort.key),
        getStudentSortValue(b.student, sort.key),
      );
      return sort.direction === "asc" ? result : -result;
    });
  }, [rows, sort]);

  return (
    <div className="flex flex-col gap-2">
      <DataTable
        headings={[
          { label: "ลำดับ", sortKey: "sequence" },
          { label: "ชื่อ - นามสกุล", sortKey: "name" },
          { label: "โรงเรียน", sortKey: "school" },
          { label: "ระดับชั้น", sortKey: "grade" },
          { label: "ห้อง", sortKey: "room" },
          { label: "สถานะ", sortKey: "status" },
        ]}
        minWidthClassName="min-w-[960px]"
        onSortChange={setSort}
        sort={sort}
      >
        {sortedRows.map(({ student, index }) => (
          <DataTableRow
            key={student.id}
            className="cursor-pointer"
            onClick={() => onRowClick(student.id)}
          >
            <DataTableCell className="text-slate-400">
              {baseIndex + index + 1}
            </DataTableCell>
            <DataTableCell>
              <StudentIdentity student={student} />
            </DataTableCell>
            <DataTableCell className="font-semibold text-slate-500">
              {student.school_name || "-"}
            </DataTableCell>
            <DataTableCell className="text-center font-bold text-slate-600">
              {student.grade || "-"}
            </DataTableCell>
            <DataTableCell className="text-center font-bold text-slate-600">
              {formatStudentRoom(student.room)}
            </DataTableCell>
            <DataTableCell>
              <Badge variant={student.student_status_category === "UNMAPPED" ? "warning" : "secondary"}>
                {student.student_status_label || "ยังไม่ได้จับคู่"}
              </Badge>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>

      <TableCardList>
        {sortedRows.map(({ student }) => (
          <TableCard
            key={student.id}
            interactive
            className="flex flex-col gap-3 transition-colors hover:border-slate-300"
            onClick={() => onRowClick(student.id)}
          >
            <StudentIdentity student={student} />
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-500">
                {student.school_name || "-"}
              </span>
              <span className="font-bold text-slate-600">
                {student.grade || "-"} · {formatStudentRoom(student.room)}
              </span>
            </div>
            <Badge className="w-fit" variant={student.student_status_category === "UNMAPPED" ? "warning" : "secondary"}>
              {student.student_status_label || "ยังไม่ได้จับคู่"}
            </Badge>
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
