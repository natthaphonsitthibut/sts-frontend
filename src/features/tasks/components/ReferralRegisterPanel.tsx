import { ReferralAccessCodeButton } from "../../cases/components/ReferralAccessCodeButton";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CircleCheck,
  ClipboardList,
  ExternalLink,
  Hourglass,
  ListChecks,
  XCircle,
} from "lucide-react";
import { Badge } from "../../../components/base";
import { LinkWarningIndicator } from "../../../components/layout/link-warning-indicator";
import { LinkShareButton } from "../../../components/layout/link-share-dialog";
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
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useGlobalSchoolFilter } from "../../school-filter/hooks/useGlobalSchoolFilter";
import { StudentIdentityCell } from "./StudentIdentityCell";
import { riskDashboardService } from "../api/risk-dashboard.service";
import {
  findStatusCatalogItem,
  useStatusCatalog,
} from "../../status-catalog/hooks/useStatusCatalog";
import { statusSummaryTone } from "../../status-catalog/lib/status-catalog-presentation";
import type { ReferralDrilldownRow } from "../types/follow-up-dashboard.types";

/**
 * The register's cards follow the referral flow — ส่งต่อ → รอผล → พิจารณา →
 * ผล — the way the กลุ่มเสี่ยง cards follow a case (owner, 2026-10-08). The two
 * waiting stages are case statuses and read their label and colour from the
 * case catalog, รอพิจารณา with the same icon as on the กลุ่มเสี่ยง tab; the two
 * results read theirs from the referral catalog. The other icons match the
 * case page's status icons.
 */
const REFERRAL_STAGE_CARDS = [
  { code: "AWAITING_REFERRAL_OUTCOME", domain: "case", icon: Hourglass },
  { code: "PENDING_REVIEW", domain: "case", icon: ListChecks },
  {
    code: "COMPLETED",
    domain: "referral",
    icon: CircleCheck,
    label: "ส่งต่อสำเร็จ",
  },
  { code: "NOT_SUCCEEDED", domain: "referral", icon: XCircle },
] as const;
type ReferralStageCard = (typeof REFERRAL_STAGE_CARDS)[number];

/**
 * Why a waiting row's link needs the school's attention, like the expired-link
 * warning beside a กลุ่มเสี่ยง row's status; null when nothing is wrong.
 */
function linkWarning(row: ReferralDrilldownRow): string | null {
  if (!row.awaitingResult) return null;
  if (!row.linkStatusCode)
    return "การส่งต่อเดิมยังไม่มีลิงก์รายงานผล กรุณายกเลิกและส่งต่อใหม่";
  if (row.linkStatusCode === "LOCKED") {
    return "ลิงก์ถูกล็อกเพราะกรอกรหัสผิดเกินกำหนด ต้องออกลิงก์ใหม่";
  }
  if (
    row.linkStatusCode === "ACTIVE" &&
    row.linkExpiresAt &&
    new Date(row.linkExpiresAt) <= new Date()
  ) {
    return "ลิงก์หมดอายุแล้ว ต้องออกลิงก์ใหม่";
  }
  return null;
}

export function ReferralRegisterPanel({
  canViewStudent = false,
  grade,
  room,
}: {
  /** Whether the student avatar links to the profile, as on the other tabs. */
  canViewStudent?: boolean;
  /** The page's ชั้น/ห้อง picker, applied here as on the other tabs. */
  grade?: string;
  room?: string;
}) {
  const { can } = usePermissions();
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [stageCode, setStageCode] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const referralStatuses = useStatusCatalog("CASE_REFERRAL");
  const caseStatuses = useStatusCatalog("CASE_WORKFLOW");
  const stagePresentation = (card: ReferralStageCard) => {
    const status = findStatusCatalogItem(
      card.domain === "case" ? caseStatuses.items : referralStatuses.items,
      card.code,
    );
    return {
      status,
      label: ("label" in card ? card.label : status?.label) ?? card.code,
    };
  };
  // A row reads the same label and colour as the card it is counted under; a
  // stage no card covers falls back to the referral catalog.
  const rowStage = (row: ReferralDrilldownRow) => {
    const card = REFERRAL_STAGE_CARDS.find(
      (candidate) => candidate.code === row.stageCode,
    );
    if (card) return stagePresentation(card);
    const status = findStatusCatalogItem(
      referralStatuses.items,
      row.statusCode,
    );
    return { status, label: status?.label ?? row.statusCode };
  };
  // The header's school/area filter narrows the register like every other tab.
  const globalFilter = useGlobalSchoolFilter();
  const area = {
    province: globalFilter.province,
    district: globalFilter.district,
    subDistrict: globalFilter.subDistrict,
    schoolId: globalFilter.schoolId,
    grade: grade ?? "",
    room: room ?? "",
  };
  const areaKey = [
    area.province,
    area.district,
    area.subDistrict,
    area.schoolId,
    area.grade,
    area.room,
  ].join("|");
  const [lastAreaKey, setLastAreaKey] = useState(areaKey);
  if (areaKey !== lastAreaKey) {
    setLastAreaKey(areaKey);
    setPage(1);
  }
  const summaryQuery = useQuery({
    queryKey: ["follow-up-summary", area],
    queryFn: () => riskDashboardService.getFollowUpSummary(area),
  });
  const drilldownQuery = useQuery({
    queryKey: [
      "referral-drilldown",
      area,
      page,
      rowsPerPage,
      stageCode,
      debouncedSearch,
    ],
    queryFn: () =>
      riskDashboardService.getReferralDrilldown(page, rowsPerPage, {
        ...area,
        stageCode: stageCode || undefined,
        searchTerm: debouncedSearch || undefined,
      }),
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
  // Counted over the same scope as the table; a status with none still shows
  // a zero rather than vanishing.
  const statusCards = REFERRAL_STAGE_CARDS.map((card) => ({
    code: card.code,
    icon: card.icon,
    ...stagePresentation(card),
  }));
  const statusItems = statusCards.map((card) => ({
    label: card.label,
    value: (
      <>
        {summary.referrals.byStage?.[card.code] ?? 0}
        <span className="ml-1 text-xl font-normal">เคส</span>
      </>
    ),
    tone: statusSummaryTone(card.status),
    icon: card.icon,
    hideComparison: true,
    labelClassName: "text-base text-content-secondary",
    emphasis: true,
    onSelect: () => {
      setStageCode((current) => (current === card.code ? "" : card.code));
      setPage(1);
    },
    selected: stageCode === card.code,
    selectionLabel: `กรอง${card.label}`,
  }));
  const rowActions = (referral: ReferralDrilldownRow) => (
    // Same pair of tools as the กลุ่มเสี่ยง rows: open the case, share its link.
    // Reviewing an agency's report starts from reading it on the case page.
    <div className="flex items-center justify-center gap-2">
      <DetailLinkButton
        aria-label={`ดูรายละเอียดเคสของ ${referral.studentName}`}
        className="bg-primary text-white hover:bg-primary-dark"
        icon={ClipboardList}
        iconOnly
        title="ดูรายละเอียดเคส"
        to={`/cases/${referral.caseId}`}
      />
      <LinkShareButton
        compact
        disabled={!referral.linkUrl}
        link={referral.linkUrl ?? ""}
        title="แชร์ลิงก์รายงานผลการส่งต่อ"
        description="เลือกช่องทางส่งลิงก์ให้หน่วยงาน แจ้งรหัสแยกจากลิงก์ ผู้รายงานต้องยืนยัน AraID ก่อนรายงานผล"
      />
      <ReferralAccessCodeButton
        compact
        caseId={referral.caseId}
        referralId={referral.id}
        disabled={
          !referral.awaitingResult ||
          !referral.linkStatusCode ||
          referral.accessCodeAvailable === false ||
          !can("case:review")
        }
        canRefresh={
          referral.linkStatusCode === "ACTIVE" &&
          Boolean(
            referral.linkExpiresAt &&
            new Date(referral.linkExpiresAt).getTime() > currentTime,
          )
        }
      />
    </div>
  );

  return (
    // The same card row every other tab uses, rather than this panel's own
    // boxes: the follow-up tab is a third view of the same report, so its
    // headline numbers have to read as headline numbers here too.
    <div className="space-y-5" data-referral-register>
      <div className="space-y-4">
        <SummaryMetrics columns={4} items={statusItems} />

        <div className="flex flex-col justify-between gap-3 pt-4 sm:flex-row">
          <SearchInput
            className="w-full sm:max-w-[430px]"
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="ค้นหาชื่อนักเรียน"
            value={search}
          />
          <FilterSelect
            ariaLabel="สถานะการส่งต่อ"
            className="w-full sm:w-[306px]"
            onChange={(value) => {
              setStageCode(value);
              setPage(1);
            }}
            value={stageCode}
          >
            <option value="">ทุกสถานะการส่งต่อ</option>
            {statusCards.map((card) => (
              <option key={card.code} value={card.code}>
                {card.label}
              </option>
            ))}
          </FilterSelect>
        </div>
      </div>

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
                "w-[20%]",
                "w-[9%]",
                "w-[8%]",
                "w-[21%]",
                "w-[14%]",
                "w-[13%]",
                "w-[9%]",
              ]}
              headings={[
                "ลำดับ",
                "ชื่อนักเรียน",
                "ชั้น",
                "ห้อง",
                "หน่วยงานที่ส่งต่อ",
                { label: "สถานะการส่งต่อ", className: "text-center" },
                "วันที่ส่งต่อ",
                { isAction: true, label: "เครื่องมือ" },
              ]}
              minWidthClassName="min-w-[1120px]"
            >
              {referrals.map((referral, index) => (
                <DataTableRow key={referral.id}>
                  <DataTableCell className="text-slate-800">
                    {(page - 1) * rowsPerPage + index + 1}
                  </DataTableCell>
                  <DataTableCell>
                    <StudentIdentityCell
                      canViewStudent={canViewStudent}
                      schoolName={referral.schoolName}
                      studentId={referral.studentId}
                      studentName={referral.studentName}
                      studentPhotoUrl={referral.studentPhotoUrl}
                    />
                  </DataTableCell>
                  <DataTableCell className="text-slate-600">
                    {referral.grade || "-"}
                  </DataTableCell>
                  <DataTableCell className="text-slate-600">
                    {referral.room || "-"}
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
                    <span className="inline-flex items-center gap-1">
                      <Badge variant={rowStage(referral).status?.badgeVariant}>
                        {rowStage(referral).label}
                      </Badge>
                      {linkWarning(referral) ? (
                        <LinkWarningIndicator
                          label={linkWarning(referral) ?? ""}
                        />
                      ) : null}
                    </span>
                  </DataTableCell>
                  <DataTableCell className="text-slate-700">
                    {formatThaiDateTime(referral.referredAt)}
                  </DataTableCell>
                  <DataTableCell>{rowActions(referral)}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTable>

            <TableCardList>
              {referrals.map((referral) => (
                <TableCard key={referral.id}>
                  <div className="flex items-start justify-between gap-3">
                    <StudentIdentityCell
                      canViewStudent={canViewStudent}
                      schoolName={referral.schoolName}
                      studentId={referral.studentId}
                      studentName={referral.studentName}
                      studentPhotoUrl={referral.studentPhotoUrl}
                    />
                    <span className="inline-flex items-center gap-1">
                      <Badge variant={rowStage(referral).status?.badgeVariant}>
                        {rowStage(referral).label}
                      </Badge>
                      {linkWarning(referral) ? (
                        <LinkWarningIndicator
                          label={linkWarning(referral) ?? ""}
                        />
                      ) : null}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-500">ระดับชั้น</div>
                      <div className="text-slate-800">
                        {referral.grade || "-"}
                        {referral.room ? `/${referral.room}` : ""}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">วันที่ส่งต่อ</div>
                      <div className="text-slate-800">
                        {formatThaiDateTime(referral.referredAt)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-slate-800">{referral.agencyName}</div>
                    <div className="text-xs text-slate-500">
                      {referral.agencyKindLabel}
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    {rowActions(referral)}
                  </div>
                </TableCard>
              ))}
            </TableCardList>

            <Pagination
              onPageChange={setPage}
              onRowsPerPageChange={(value) => {
                setRowsPerPage(value);
                setPage(1);
              }}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={PAGE_SIZE_OPTIONS}
              totalCount={drilldownQuery.data?.meta.totalCount ?? 0}
              unitLabel="รายการ"
            />
          </div>
        )}
      </div>
    </div>
  );
}
