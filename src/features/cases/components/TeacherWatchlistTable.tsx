import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { formatThaiDateTime } from "../../../lib/date-time";
import type { TeacherWatchlistRow } from "../../student-observations/types/student-observation.types";

interface TeacherWatchlistTableProps {
  rows: TeacherWatchlistRow[];
}

function StudentScope({ row }: { row: TeacherWatchlistRow }) {
  return (
    <>
      <p className="font-bold text-slate-800">{row.studentName}</p>
      <p className="mt-1 text-xs text-slate-500">
        {row.schoolName}
        {row.gradeLabel ? ` · ${row.gradeLabel}` : ""}
        {row.roomNo ? ` / ${row.roomNo}` : ""}
      </p>
    </>
  );
}

export function TeacherWatchlistTable({ rows }: TeacherWatchlistTableProps) {
  return (
    <div className="flex flex-col gap-2">
      <DataTable
        headings={[
          "นักเรียน",
          "ความคิดเห็นล่าสุด",
          "ผู้บันทึก / เวลา",
          "ประวัติ",
          "",
        ]}
        columnWidths={["w-[24%]", "w-[34%]", "w-[22%]", "w-[8%]", "w-[12%]"]}
        minWidthClassName="min-w-[900px]"
      >
        {rows.map((row) => (
          <DataTableRow key={row.studentTermId}>
            <DataTableCell>
              <StudentScope row={row} />
            </DataTableCell>
            <DataTableCell>
              <p className="line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">
                {row.latestComment}
              </p>
            </DataTableCell>
            <DataTableCell>
              <p className="font-semibold text-slate-700">
                {row.latestAuthorDisplayName}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatThaiDateTime(row.latestCommentedAt)}
              </p>
            </DataTableCell>
            <DataTableCell className="text-center font-semibold text-slate-700">
              {row.commentCount} ครั้ง
            </DataTableCell>
            <DataTableCell className="text-right">
              <DetailLinkButton to={`/students/${row.studentTermId}`}>
                ดูนักเรียน
              </DetailLinkButton>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>

      <TableCardList>
        {rows.map((row) => (
          <TableCard key={row.studentTermId}>
            <div className="min-w-0">
              <StudentScope row={row} />
            </div>
            <div className="mt-3 rounded-md bg-slate-50 p-3">
              <p className="whitespace-pre-wrap text-sm text-slate-600">
                {row.latestComment}
              </p>
            </div>
            <div className="mt-3 text-sm text-slate-600">
              <p>ผู้บันทึก: {row.latestAuthorDisplayName}</p>
              <p className="mt-1 text-xs text-slate-500">
                {formatThaiDateTime(row.latestCommentedAt)} · รวม{" "}
                {row.commentCount} ครั้ง
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <DetailLinkButton to={`/students/${row.studentTermId}`}>
                ดูนักเรียน
              </DetailLinkButton>
            </div>
          </TableCard>
        ))}
      </TableCardList>
    </div>
  );
}
