import { ClipboardList, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, type BadgeProps } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
} from "../../../components/layout/data-table";
import { Pagination } from "../../../components/layout/pagination";
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
import { CaseStatusBadge } from "../../cases/components/CaseStatusBadge";
import { useStatusCatalog, findStatusCatalogItem } from "../../status-catalog/hooks/useStatusCatalog";
import { RiskReportTabs } from "../components/RiskReportTabs";
import { useTeacherObservationReports } from "../hooks/useStudentObservations";
import type { FollowUpStatus, ObservationConcernLevel } from "../types/student-observation.types";

const concernOptions: Array<{ value: "ALL" | ObservationConcernLevel; label: string }> = [
  { value: "ALL", label: "ทุกระดับข้อสังเกต" },
  { value: "NOTE", label: "บันทึกทั่วไป" },
  { value: "WATCH", label: "ควรเฝ้าดู" },
  { value: "CONCERN", label: "น่ากังวล" },
];

function concernPresentation(level: ObservationConcernLevel): { label: string; variant: BadgeProps["variant"] } {
  if (level === "CONCERN") return { label: "น่ากังวล", variant: "destructive" };
  if (level === "WATCH") return { label: "ควรเฝ้าดู", variant: "warning" };
  return { label: "บันทึกทั่วไป", variant: "secondary" };
}

export function TeacherObservationReportsPage() {
  const navigate = useNavigate();
  const followUpCatalog = useStatusCatalog("STUDENT_FOLLOW_UP_REQUEST");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | FollowUpStatus>("ALL");
  const [concernLevel, setConcernLevel] = useState<"ALL" | ObservationConcernLevel>("ALL");
  const debouncedSearch = useDebouncedValue(search, 300);
  const reports = useTeacherObservationReports({
    page,
    limit: rowsPerPage,
    searchTerm: debouncedSearch.trim() || undefined,
    status: status === "ALL" ? undefined : status,
    concernLevel: concernLevel === "ALL" ? undefined : concernLevel,
  });
  const rows = reports.data?.data ?? [];
  const totalCount = reports.data?.meta.totalCount ?? 0;

  function resetFilters() {
    setSearch("");
    setStatus("ALL");
    setConcernLevel("ALL");
    setPage(1);
  }

  return (
    <PageShell>
      <ListPageToolbar
        icon={ClipboardList}
        title="รายงานนักเรียน"
        description="คิวข้อสังเกตและคำขอติดตามจากครูในขอบเขตข้อมูลของคุณ"
        tableActions={<RefreshButton onRefresh={() => void reports.refetch()} updatedAt={reports.dataUpdatedAt} />}
        onClearFilters={resetFilters}
        search={{
          value: search,
          onChange: (value) => { setSearch(value); setPage(1); },
          placeholder: "ค้นหาชื่อนักเรียนหรือรหัสรายงาน",
        }}
        filters={
          <>
            <FilterSelect ariaLabel="สถานะคำขอติดตาม" value={status} onChange={(value) => { setStatus(value as "ALL" | FollowUpStatus); setPage(1); }}>
              <option value="ALL">ทุกสถานะคำขอ</option>
              {followUpCatalog.items.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </FilterSelect>
            <FilterSelect ariaLabel="ระดับข้อสังเกต" value={concernLevel} onChange={(value) => { setConcernLevel(value as "ALL" | ObservationConcernLevel); setPage(1); }}>
              {concernOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </FilterSelect>
          </>
        }
      />
      <RiskReportTabs />

      {reports.isLoading ? (
        <SkeletonTable rows={8} />
      ) : reports.isError ? (
        <ErrorState title="โหลดรายงานจากครูไม่สำเร็จ" onRetry={() => void reports.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="ไม่พบรายงานจากครู" description="ลองเปลี่ยนตัวกรอง หรือรอข้อสังเกตใหม่จากครู" />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <DataTable
            headings={["นักเรียน", "ข้อสังเกต", "ผู้รายงาน", "สถานะคำขอ", "เคส", ""]}
            minWidthClassName="min-w-[980px]"
            responsive={false}
          >
            {rows.map((row) => {
              const concern = concernPresentation(row.concernLevel);
              const followUpStatus = findStatusCatalogItem(followUpCatalog.items, row.followUpStatus);
              return (
                <DataTableRow key={`${row.reportKind}-${row.reportId}`}>
                  <DataTableCell>
                    <button className="text-left font-bold text-primary hover:underline" onClick={() => void navigate(`/students/${row.studentTermId}`)} type="button">
                      {row.studentName}
                    </button>
                    <p className="mt-1 text-xs text-slate-500">{row.schoolName}{row.gradeLabel ? ` · ${row.gradeLabel}` : ""}{row.roomNo ? ` / ${row.roomNo}` : ""}</p>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex flex-wrap items-center gap-2"><Badge variant={concern.variant}>{concern.label}</Badge><span className="font-semibold text-slate-800">{row.dimensionLabel}</span></div>
                    {row.comment ? <p className="mt-1 max-w-[36ch] whitespace-pre-wrap text-sm text-slate-600">{row.comment}</p> : null}
                  </DataTableCell>
                  <DataTableCell>
                    <p className="font-semibold text-slate-700">{row.authorDisplayName}</p>
                    <p className="text-xs text-slate-500">{formatThaiDateTime(row.observedAt)}</p>
                  </DataTableCell>
                  <DataTableCell>
                    {row.followUpStatus && followUpStatus ? <Badge variant={followUpStatus.badgeVariant}>{followUpStatus.label}</Badge> : <span className="text-sm text-slate-500">ยังไม่ได้ส่งคำขอ</span>}
                  </DataTableCell>
                  <DataTableCell>{row.openedCaseStatus ? <CaseStatusBadge status={row.openedCaseStatus} /> : <span className="text-slate-500">-</span>}</DataTableCell>
                  <DataTableCell>
                    <Button icon={ExternalLink} onClick={() => void navigate(row.openedCaseId ? "/cases" : `/students/${row.studentTermId}`)} size="sm" variant="outline">
                      {row.openedCaseId ? "ไปหน้าเคส" : "เปิดโปรไฟล์"}
                    </Button>
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTable>
          <Pagination page={page} rowsPerPage={rowsPerPage} rowsPerPageOptions={PAGE_SIZE_OPTIONS} totalCount={totalCount} onPageChange={setPage} onRowsPerPageChange={(value) => { setRowsPerPage(value); setPage(1); }} />
        </div>
      )}
    </PageShell>
  );
}
