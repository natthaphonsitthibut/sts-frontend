import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import { Pagination } from "../../../components/layout/pagination";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { RefreshButton } from "../../../components/layout/refresh-button";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  ListPageToolbar,
  PageShell,
  SkeletonTable,
} from "../../../components/layout/page-primitives";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { formatThaiDateTime } from "../../../lib/date-time";
import { RiskReportTabs } from "../components/RiskReportTabs";
import { useTeacherObservationReports } from "../hooks/useStudentObservations";
import { getObservationConcernPresentation, observationConcernOptions } from "../lib/observation-presentation";
import type { ObservationConcernLevel } from "../types/student-observation.types";

export function TeacherObservationReportsPage() {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [concernLevel, setConcernLevel] = useState<"ALL" | ObservationConcernLevel>("ALL");
  const [sort, setSort] = useState<DataTableSortState>();
  const debouncedSearch = useDebouncedValue(search, 300);
  const reports = useTeacherObservationReports({
    page,
    limit: rowsPerPage,
    searchTerm: debouncedSearch.trim() || undefined,
    concernLevel: concernLevel === "ALL" ? undefined : concernLevel,
    sortBy: sort?.key as "studentName" | "dimension" | "concernLevel" | "comment" | "author" | undefined,
    sortDirection: sort?.direction,
  });
  const rows = reports.data?.data ?? [];
  const totalCount = reports.data?.meta.totalCount ?? 0;

  function resetFilters() {
    setSearch("");
    setConcernLevel("ALL");
    setPage(1);
  }

  return (
    <PageShell>
      <ListPageToolbar
        navigation={<RiskReportTabs />}
        icon={ClipboardList}
        title="ข้อสังเกตจากครู"
        description="ตรวจรายละเอียดที่ครูบันทึกและใช้ประกอบการทบทวนความเสี่ยงของนักเรียน"
        tableActions={<RefreshButton onRefresh={() => void reports.refetch()} updatedAt={reports.dataUpdatedAt} />}
        onClearFilters={resetFilters}
        search={{
          value: search,
          onChange: (value) => { setSearch(value); setPage(1); },
          placeholder: "ค้นหาชื่อนักเรียนหรือรหัสรายงาน",
        }}
        filters={
          <FilterSelect ariaLabel="ระดับข้อสังเกต" value={concernLevel} onChange={(value) => { setConcernLevel(value as "ALL" | ObservationConcernLevel); setPage(1); }}>
            {observationConcernOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </FilterSelect>
        }
      />

      {reports.isLoading ? (
        <SkeletonTable rows={8} />
      ) : reports.isError ? (
        <ErrorState title="โหลดข้อสังเกตจากครูไม่สำเร็จ" onRetry={() => void reports.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="ไม่พบข้อสังเกตจากครู" description="ลองเปลี่ยนตัวกรอง หรือรอข้อสังเกตใหม่จากครู" />
      ) : (
        <>
          <DataTable
            headings={[
              { label: "นักเรียน", sortKey: "studentName" },
              { label: "ด้านที่พบ", sortKey: "dimension" },
              { label: "ระดับข้อสังเกต", sortKey: "concernLevel" },
              { label: "ความเห็น", sortKey: "comment" },
              { label: "ผู้รายงาน", sortKey: "author" },
              "",
            ]}
            minWidthClassName="min-w-[1080px]"
            onSortChange={(next) => { setSort(next); setPage(1); }}
            responsive={false}
            sort={sort}
          >
            {rows.map((row) => {
              const concern = getObservationConcernPresentation(row.concernLevel);
              return (
                <DataTableRow key={`${row.reportKind}-${row.reportId}`}>
                  <DataTableCell>
                    <p className="font-bold text-slate-800">{row.studentName}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.schoolName}{row.gradeLabel ? ` · ${row.gradeLabel}` : ""}{row.roomNo ? ` / ${row.roomNo}` : ""}</p>
                  </DataTableCell>
                  <DataTableCell className="font-semibold text-slate-800">{row.dimensionLabel}</DataTableCell>
                  <DataTableCell><Badge variant={concern.variant}>{concern.label}</Badge></DataTableCell>
                  <DataTableCell><p className="max-w-[34ch] line-clamp-2 whitespace-pre-wrap text-sm text-slate-600">{row.comment || "-"}</p></DataTableCell>
                  <DataTableCell>
                    <p className="font-semibold text-slate-700">{row.authorDisplayName}</p>
                    <p className="text-xs text-slate-500">{formatThaiDateTime(row.observedAt)}</p>
                  </DataTableCell>
                  <DataTableCell>
                    <DetailLinkButton to={`/student-risk-report/teacher-reports/${row.observationId}`} />
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTable>
          <Pagination page={page} rowsPerPage={rowsPerPage} rowsPerPageOptions={PAGE_SIZE_OPTIONS} totalCount={totalCount} onPageChange={setPage} onRowsPerPageChange={(value) => { setRowsPerPage(value); setPage(1); }} />
        </>
      )}
    </PageShell>
  );
}
