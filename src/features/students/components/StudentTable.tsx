import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
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
      className="flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
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
        <h3 className="truncate text-lg font-extrabold tracking-[-0.01em] text-slate-800">
          {student.name}
        </h3>
        <div className="mt-0.5 text-xs font-semibold text-slate-400">
          รหัส: {student.id}
        </div>
      </div>
    </div>
  );
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

  return (
    <div className="flex flex-col gap-2">
      <DataTable
        headings={["#", "ชื่อ - นามสกุล", "โรงเรียน", "ระดับชั้น", "ห้อง"]}
        minWidthClassName="min-w-[860px]"
      >
        {rows.map((student, index) => (
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
            <DataTableCell className="text-center text-base font-bold text-slate-600">
              {student.grade || "-"}
            </DataTableCell>
            <DataTableCell className="text-center text-base font-bold text-slate-600">
              {formatStudentRoom(student.room)}
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>

      <TableCardList>
        {rows.map((student) => (
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
