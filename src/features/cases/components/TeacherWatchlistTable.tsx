import { Badge } from "../../../components/base";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { formatThaiDateTime } from "../../../lib/date-time";
import { getObservationConcernPresentation } from "../../student-observations/lib/observation-presentation";
import type { TeacherWatchlistRow } from "../../student-observations/types/student-observation.types";

interface TeacherWatchlistTableProps {
  rows: TeacherWatchlistRow[];
}

const NO_COMMENT = "ไม่ได้ระบุความคิดเห็นเพิ่มเติม";

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
          "ข้อสังเกตล่าสุด",
          "ความคิดเห็น",
          "ผู้บันทึก / เวลา",
          "ประวัติ",
          "",
        ]}
        columnWidths={[
          "w-[20%]",
          "w-[17%]",
          "w-[25%]",
          "w-[18%]",
          "w-[8%]",
          "w-[12%]",
        ]}
        minWidthClassName="min-w-[1050px]"
      >
        {rows.map((row) => {
          const concern = getObservationConcernPresentation(
            row.latestConcernLevel,
          );
          return (
            <DataTableRow key={row.studentTermId}>
              <DataTableCell>
                <StudentScope row={row} />
              </DataTableCell>
              <DataTableCell>
                <p className="mb-1.5 font-semibold text-slate-800">
                  {row.latestDimensionLabel}
                </p>
                <Badge variant={concern.variant}>{concern.label}</Badge>
              </DataTableCell>
              <DataTableCell>
                <p className="line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">
                  {row.latestComment || NO_COMMENT}
                </p>
              </DataTableCell>
              <DataTableCell>
                <p className="font-semibold text-slate-700">
                  {row.latestAuthorDisplayName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatThaiDateTime(row.latestObservedAt)}
                </p>
              </DataTableCell>
              <DataTableCell className="text-center font-semibold text-slate-700">
                {row.observationCount} ครั้ง
              </DataTableCell>
              <DataTableCell className="text-right">
                <DetailLinkButton to={`/students/${row.studentTermId}`}>
                  ดูนักเรียน
                </DetailLinkButton>
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTable>

      <TableCardList>
        {rows.map((row) => {
          const concern = getObservationConcernPresentation(
            row.latestConcernLevel,
          );
          return (
            <TableCard key={row.studentTermId}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <StudentScope row={row} />
                </div>
                <Badge variant={concern.variant}>{concern.label}</Badge>
              </div>
              <div className="mt-3 rounded-md bg-slate-50 p-3">
                <p className="font-semibold text-slate-800">
                  {row.latestDimensionLabel}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                  {row.latestComment || NO_COMMENT}
                </p>
              </div>
              <div className="mt-3 text-sm text-slate-600">
                <p>ผู้บันทึก: {row.latestAuthorDisplayName}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatThaiDateTime(row.latestObservedAt)} · รวม{" "}
                  {row.observationCount} ครั้ง
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <DetailLinkButton to={`/students/${row.studentTermId}`}>
                  ดูนักเรียน
                </DetailLinkButton>
              </div>
            </TableCard>
          );
        })}
      </TableCardList>
    </div>
  );
}
