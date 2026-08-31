import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ban, Check, ExternalLink, Inbox, Send, X } from "lucide-react";
import { Badge } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { Pagination } from "../../../components/layout/pagination";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  SearchInput,
  SkeletonCards,
  SkeletonTable,
  SummaryMetrics,
} from "../../../components/layout/page-primitives";
import { formatThaiDateTime } from "../../../lib/date-time";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { StudentAvatar } from "../../students/components/StudentAvatar";
import { riskDashboardService } from "../api/risk-dashboard.service";
import {
  findStatusCatalogItem,
  useStatusCatalog,
} from "../../status-catalog/hooks/useStatusCatalog";
import { statusSummaryTone } from "../../status-catalog/lib/status-catalog-presentation";

/**
 * The icon per status — the one thing the status catalog does not carry.
 *
 * Colour is deliberately absent: `case_referral_statuses` already defines
 * `badgeVariant` and `summaryTone` for each status, and both the card and the
 * badge read them, so recolouring a status in the catalog moves both together
 * instead of leaving the badge disagreeing with the card above it. An unknown
 * code still renders, with the generic referral icon.
 */
const REFERRAL_STATUS_ICON: Record<string, typeof Send> = {
  REFERRED: Send,
  ACCEPTED: Inbox,
  COMPLETED: Check,
  DECLINED: X,
  CANCELLED: Ban,
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;

export function ReferralRegisterPanel({
  aggregateOnly = false,
}: {
  aggregateOnly?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [statusCode, setStatusCode] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const referralStatuses = useStatusCatalog("CASE_REFERRAL");
  const referralStatus = (code: string) =>
    findStatusCatalogItem(referralStatuses.items, code);
  const referralStatusLabel = (code: string): string =>
    referralStatus(code)?.label ?? code;
  const summaryQuery = useQuery({
    queryKey: ["follow-up-summary"],
    queryFn: riskDashboardService.getFollowUpSummary,
  });
  const drilldownQuery = useQuery({
    queryKey: [
      "referral-drilldown",
      page,
      rowsPerPage,
      statusCode,
      debouncedSearch,
    ],
    queryFn: () =>
      riskDashboardService.getReferralDrilldown(page, rowsPerPage, {
        statusCode: statusCode || undefined,
        searchTerm: debouncedSearch || undefined,
      }),
    enabled: !aggregateOnly,
  });
  const referrals = drilldownQuery.data?.items ?? [];

  if (summaryQuery.isLoading) {
    return <SkeletonCards count={3} />;
  }
  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <ErrorState
        description="กรุณาลองโหลดข้อมูลภาพรวมอีกครั้ง"
        onRetry={() => void summaryQuery.refetch()}
        title="โหลดภาพรวมการติดตามไม่สำเร็จ"
      />
    );
  }
  const summary = summaryQuery.data;
  // Every status the catalog knows, in its own order, counted over the same
  // scope as the table — so the cards partition the rows instead of hinting at
  // them, and a status with none still shows a zero rather than vanishing.
  const statusItems = referralStatuses.items.map((status) => ({
    label: status.label,
    value: summary.referrals.byStatus?.[status.code] ?? 0,
    tone: statusSummaryTone(status),
    icon: REFERRAL_STATUS_ICON[status.code] ?? ExternalLink,
    hideComparison: true,
    labelClassName: "text-base text-content-secondary",
    emphasis: true,
    onSelect: () => {
      setStatusCode((current) => (current === status.code ? "" : status.code));
      setPage(1);
    },
    selected: statusCode === status.code,
    selectionLabel: `กรอง${status.label}`,
  }));

  return (
    // The same card row every other tab uses, rather than this panel's own
    // boxes: the follow-up tab is a third view of the same report, so its
    // headline numbers have to read as headline numbers here too.
    <div className="space-y-5" data-referral-register>
      <div className="space-y-4">
        <SummaryMetrics
          columns={statusItems.length >= 5 ? 5 : 4}
          items={statusItems}
        />

        <div className="flex flex-col justify-between gap-3 pt-4 sm:flex-row">
          <SearchInput
            className="w-full sm:max-w-[430px]"
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="ค้นหาชื่อนักเรียนหรือหน่วยงาน"
            value={search}
          />
          <FilterSelect
            ariaLabel="สถานะการส่งต่อ"
            className="w-full sm:w-[306px]"
            onChange={(value) => {
              setStatusCode(value);
              setPage(1);
            }}
            value={statusCode}
          >
            <option value="">ทุกสถานะการส่งต่อ</option>
            {referralStatuses.items.map((status) => (
              <option key={status.code} value={status.code}>
                {status.label}
              </option>
            ))}
          </FilterSelect>
        </div>
      </div>

      {!aggregateOnly ? (
        <div>
          {/* The same table both student tabs use, rather than a collapsed
              drilldown: the referrals are a list of cases like any other, and
              hiding them behind a toggle made this the one view where the rows
              were not simply there to read. */}
          {drilldownQuery.isError ? (
            <ErrorState
              description="ไม่สามารถเปิดรายชื่อได้ กรุณาตรวจสอบสิทธิ์หรือโหลดใหม่"
              onRetry={() => void drilldownQuery.refetch()}
              title="โหลดรายการส่งต่อไม่สำเร็จ"
            />
          ) : drilldownQuery.isLoading ? (
            <SkeletonTable />
          ) : referrals.length === 0 ? (
            <EmptyState
              icon={ExternalLink}
              title="ยังไม่มีเคสที่ส่งต่อ"
              description="เคสที่ส่งต่อให้หน่วยงานภายนอกจะแสดงที่นี่"
            />
          ) : (
            <div className="flex flex-col gap-2">
              <DataTable
                columnWidths={[
                  "w-[6%]",
                  "w-[26%]",
                  "w-[22%]",
                  "w-[16%]",
                  "w-[18%]",
                  "w-[12%]",
                ]}
                headings={[
                  "ลำดับ",
                  "ชื่อนักเรียน",
                  "หน่วยงานที่ส่งต่อ",
                  { label: "สถานะการส่งต่อ", className: "text-center" },
                  "วันที่ส่งต่อ",
                  "เครื่องมือ",
                ]}
                minWidthClassName="min-w-[960px]"
              >
                {referrals.map((referral, index) => (
                  <DataTableRow key={referral.id}>
                    <DataTableCell className="text-slate-800">
                      {(page - 1) * rowsPerPage + index + 1}
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <StudentAvatar
                          className="shrink-0"
                          name={referral.studentName}
                          photoUrl={referral.studentPhotoUrl}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-slate-800">
                            {referral.studentName}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {referral.schoolName || "ไม่ระบุโรงเรียน"}
                          </div>
                        </div>
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <div className="min-w-0">
                        <div className="truncate text-slate-800">
                          {referral.agencyName}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {referral.agencyKindLabel}
                        </div>
                      </div>
                    </DataTableCell>
                    <DataTableCell className="text-center">
                      <Badge
                        variant={
                          referralStatus(referral.statusCode)?.badgeVariant
                        }
                      >
                        {referralStatusLabel(referral.statusCode)}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell className="text-slate-700">
                      {formatThaiDateTime(referral.referredAt)}
                    </DataTableCell>
                    <DataTableCell>
                      <DetailLinkButton
                        aria-label={`ดูรายละเอียดการส่งต่อของ ${referral.studentName}`}
                        iconOnly
                        to={`/cases/${referral.caseId}`}
                      />
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTable>

              <TableCardList>
                {referrals.map((referral) => (
                  <TableCard key={referral.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <StudentAvatar
                          className="shrink-0"
                          name={referral.studentName}
                          photoUrl={referral.studentPhotoUrl}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {referral.studentName}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {referral.schoolName || "ไม่ระบุโรงเรียน"}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          referralStatus(referral.statusCode)?.badgeVariant
                        }
                      >
                        {referralStatusLabel(referral.statusCode)}
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <div className="text-slate-800">
                        {referral.agencyName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {referral.agencyKindLabel} ·{" "}
                        {formatThaiDateTime(referral.referredAt)}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <DetailLinkButton
                        aria-label={`ดูรายละเอียดการส่งต่อของ ${referral.studentName}`}
                        iconOnly
                        to={`/cases/${referral.caseId}`}
                      />
                    </div>
                  </TableCard>
                ))}
              </TableCardList>

              <Pagination
                onPageChange={setPage}
                onRowsPerPageChange={setRowsPerPage}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                totalCount={drilldownQuery.data?.meta.totalCount ?? 0}
                unitLabel="รายการ"
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
