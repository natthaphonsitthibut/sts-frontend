import { HouseHeart } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../../components/base";
import { DataTable, DataTableCell, DataTableRow, type DataTableSortState } from "../../../components/layout/data-table";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
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
import { formatThaiDateTime } from "../../../lib/date-time";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { CaseStatusBadge } from "../../cases/components/CaseStatusBadge";
import { findStatusCatalogItem, useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import { RiskReportTabs } from "../components/RiskReportTabs";
import { useHomeVisitRequests } from "../hooks/useStudentObservations";
import { getHomeVisitUrgencyPresentation } from "../lib/observation-presentation";
import type { FollowUpStatus, FollowUpUrgency } from "../types/student-observation.types";

export function HomeVisitRequestsPage() {
  const statusCatalog = useStatusCatalog("STUDENT_FOLLOW_UP_REQUEST");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | FollowUpStatus>("ALL");
  const [urgency, setUrgency] = useState<"ALL" | FollowUpUrgency>("ALL");
  const [sort, setSort] = useState<DataTableSortState>();
  const debouncedSearch = useDebouncedValue(search, 300);
  const requests = useHomeVisitRequests({
    page,
    limit: rowsPerPage,
    searchTerm: debouncedSearch.trim() || undefined,
    status: status === "ALL" ? undefined : status,
    urgency: urgency === "ALL" ? undefined : urgency,
    sortBy: sort?.key as "studentName" | "reason" | "urgency" | "requester" | "status" | "caseStatus" | undefined,
    sortDirection: sort?.direction,
  });
  const rows = requests.data?.data ?? [];
  const totalCount = requests.data?.meta.totalCount ?? 0;

  function resetFilters() {
    setSearch("");
    setStatus("ALL");
    setUrgency("ALL");
    setPage(1);
  }

  return (
    <PageShell>
      <ListPageToolbar
        actions={<RiskReportTabs />}
        description="พิจารณาคำขอจากครูและติดตามเคสเยี่ยมบ้านที่เปิดจากคำขอ"
        icon={HouseHeart}
        onClearFilters={resetFilters}
        search={{
          value: search,
          onChange: (value) => { setSearch(value); setPage(1); },
          placeholder: "ค้นหาชื่อนักเรียน รหัสคำขอ หรือเหตุผล",
        }}
        filters={
          <>
            <FilterSelect ariaLabel="สถานะคำขอเยี่ยมบ้าน" value={status} onChange={(value) => { setStatus(value as "ALL" | FollowUpStatus); setPage(1); }}>
              <option value="ALL">ทุกสถานะคำขอ</option>
              {statusCatalog.items.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </FilterSelect>
            <FilterSelect ariaLabel="ความเร่งด่วน" value={urgency} onChange={(value) => { setUrgency(value as "ALL" | FollowUpUrgency); setPage(1); }}>
              <option value="ALL">ทุกความเร่งด่วน</option>
              <option value="NORMAL">ปกติ</option>
              <option value="URGENT">เร่งด่วน</option>
            </FilterSelect>
          </>
        }
        tableActions={<RefreshButton onRefresh={() => void requests.refetch()} updatedAt={requests.dataUpdatedAt} />}
        title="คำขอเยี่ยมบ้าน"
      />

      {requests.isLoading ? (
        <SkeletonTable rows={8} />
      ) : requests.isError ? (
        <ErrorState title="โหลดคำขอเยี่ยมบ้านไม่สำเร็จ" onRetry={() => void requests.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={HouseHeart} title="ไม่พบคำขอเยี่ยมบ้าน" description="ลองเปลี่ยนตัวกรอง หรือรอคำขอใหม่จากครู" />
      ) : (
        <>
          <DataTable
            headings={[
              { label: "นักเรียน", sortKey: "studentName" },
              { label: "เหตุผล", sortKey: "reason" },
              { label: "ความเร่งด่วน", sortKey: "urgency" },
              { label: "ผู้ขอ", sortKey: "requester" },
              { label: "สถานะ", sortKey: "status" },
              { label: "เคส", sortKey: "caseStatus" },
              "",
            ]}
            minWidthClassName="min-w-[1120px]"
            onSortChange={(next) => { setSort(next); setPage(1); }}
            responsive={false}
            sort={sort}
          >
            {rows.map((row) => {
              const statusMeta = findStatusCatalogItem(statusCatalog.items, row.status);
              const urgencyMeta = getHomeVisitUrgencyPresentation(row.urgency);
              return (
                <DataTableRow key={row.id}>
                  <DataTableCell>
                    <p className="font-bold text-slate-800">{row.student.displayName}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.student.schoolName}{row.student.gradeLabel ? ` · ${row.student.gradeLabel}` : ""}{row.student.roomNo ? ` / ${row.student.roomNo}` : ""}</p>
                  </DataTableCell>
                  <DataTableCell><p className="max-w-[34ch] line-clamp-2 whitespace-pre-wrap text-sm text-slate-600">{row.reason}</p></DataTableCell>
                  <DataTableCell><Badge variant={urgencyMeta.variant}>{urgencyMeta.label}</Badge></DataTableCell>
                  <DataTableCell>
                    <p className="font-semibold text-slate-700">{row.requestedBy.username}</p>
                    <p className="text-xs text-slate-500">{formatThaiDateTime(row.createdAt)}</p>
                  </DataTableCell>
                  <DataTableCell><Badge variant={statusMeta?.badgeVariant ?? "secondary"}>{statusMeta?.label ?? row.statusPresentation.labelTh}</Badge></DataTableCell>
                  <DataTableCell>{row.openedCase ? <CaseStatusBadge status={row.openedCase.status} /> : <span className="text-slate-500">-</span>}</DataTableCell>
                  <DataTableCell><DetailLinkButton to={`/student-risk-report/home-visit-requests/${row.id}`} /></DataTableCell>
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
