import { useState } from "react";
import { UserCheck } from "lucide-react";
import {
  Badge,
  Tabs,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import {
  EmptyState,
  ErrorState,
  ListPageToolbar,
  PageShell,
  SkeletonTable,
} from "../../../components/layout/page-primitives";
import { Pagination } from "../../../components/layout/pagination";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { FieldFollowerReviewFilter } from "../components/FieldFollowerReviewFilter";
import { AuditLogPanel } from "../../audit-log/components/AuditLogPanel";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { formatThaiDateTime } from "../../../lib/date-time";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { FollowerRecruitmentCampaignsSection } from "../components/FollowerRecruitmentCampaignsSection";
import { useFieldFollowers } from "../hooks/useFieldFollowers";
import {
  getFieldFollowerAreaText,
  getFieldFollowerFullName,
  getFieldFollowerStatusMeta,
} from "../lib/field-follower-presentation";
import {
  type FieldFollowerStatus,
} from "../types/field-follower.types";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const FIELD_FOLLOWERS_TAB_ROUTES = {
  links: "/field-followers",
  history: "/field-followers/history",
  review: "/field-followers-review",
  reviewHistory: "/field-followers-review/history",
} as const;

const LINK_TAB_OPTIONS = [
  { value: "links", label: "ลิงก์รับสมัคร" },
  { value: "history", label: "ประวัติ" },
];

const REVIEW_TAB_OPTIONS = [
  { value: "review", label: "ตรวจสอบใบสมัคร" },
  { value: "reviewHistory", label: "ประวัติ" },
];

const FOLLOWER_CAMPAIGN_AUDIT_ACTION_OPTIONS = [
  { value: "FOLLOWER_CAMPAIGN_CREATE", label: "สร้างลิงก์รับสมัคร" },
  { value: "FOLLOWER_CAMPAIGN_UPDATE", label: "แก้ไข/เปิด-ปิดลิงก์" },
  { value: "FOLLOWER_CAMPAIGN_DELETE", label: "ลบลิงก์รับสมัคร" },
] as const;

const FIELD_FOLLOWER_REVIEW_AUDIT_ACTION_OPTIONS = [
  { value: "FIELD_FOLLOWER_REVIEW", label: "ตรวจสอบใบสมัคร" },
] as const;

export function FieldFollowersReviewPage() {
  const [activeTab, setActiveTab] = useRouteTab(FIELD_FOLLOWERS_TAB_ROUTES, "links");
  const [status, setStatus] = useState<FieldFollowerStatus | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);
  const area = useSchoolAreaFilter();
  const followerStatusCatalog = useStatusCatalog("FIELD_FOLLOWER_STATUS").items;

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);
  const query = useFieldFollowers({
    status: status || undefined,
    province: area.province || undefined,
    district: area.district || undefined,
    subDistrict: area.subDistrict || undefined,
    searchTerm: debouncedSearch || undefined,
    page,
    limit,
  });

  const followers = query.data?.data ?? [];

  function resetToFirstPage(): void {
    setPage(1);
  }

  function handleSearchChange(value: string): void {
    setSearchQuery(value);
    resetToFirstPage();
  }

  return (
    <PageShell>
      {activeTab === "links" ? (
        <>
          <FollowerRecruitmentCampaignsSection
            actions={
              <Tabs
                aria-label="โหมดผู้สมัคร อสม./ผู้ติดตาม"
                onChange={setActiveTab}
                options={LINK_TAB_OPTIONS}
                value={activeTab}
              />
            }
          />
        </>
      ) : activeTab === "history" ? (
        <>
          <ListPageToolbar
            actions={
              <Tabs
                aria-label="โหมดผู้สมัคร อสม./ผู้ติดตาม"
                onChange={setActiveTab}
                options={LINK_TAB_OPTIONS}
                value={activeTab}
              />
            }
            description="ดูประวัติการสร้าง แก้ไข เปิด-ปิด และลบลิงก์รับสมัครย้อนหลัง"
            icon={UserCheck}
            title="ลิงก์รับสมัคร"
          />
          <AuditLogPanel
            actionOptions={FOLLOWER_CAMPAIGN_AUDIT_ACTION_OPTIONS}
            description="ดูประวัติการสร้าง แก้ไข เปิด-ปิด และลบลิงก์รับสมัครย้อนหลัง"
            domain="field_followers"
            targetType="follower_recruitment_campaign"
            title="ประวัติลิงก์รับสมัคร"
          />
        </>
      ) : activeTab === "reviewHistory" ? (
        <>
          <ListPageToolbar
            actions={
              <Tabs
                aria-label="โหมดตรวจสอบใบสมัคร"
                onChange={setActiveTab}
                options={REVIEW_TAB_OPTIONS}
                value={activeTab}
              />
            }
            description="ดูประวัติการอนุมัติ ปฏิเสธ ระงับ และเปิดใช้งานใบสมัครย้อนหลัง"
            icon={UserCheck}
            title="ตรวจสอบใบสมัคร"
          />
          <AuditLogPanel
            actionOptions={FIELD_FOLLOWER_REVIEW_AUDIT_ACTION_OPTIONS}
            description="ดูประวัติการตรวจสอบใบสมัครย้อนหลัง"
            domain="field_followers"
            fixedAction="FIELD_FOLLOWER_REVIEW"
            targetType="field_follower"
            title="ประวัติการตรวจสอบใบสมัคร"
          />
        </>
      ) : (
        <>
          <FieldFollowerReviewFilter
            actions={
              <Tabs
                aria-label="โหมดผู้สมัคร อสม./ผู้ติดตาม"
                onChange={setActiveTab}
                options={REVIEW_TAB_OPTIONS}
                value={activeTab}
              />
            }
            area={area}
            onRefresh={query.refetch}
            onSearchChange={handleSearchChange}
            onStatusChange={(value) => {
              setStatus(value as FieldFollowerStatus | "");
              resetToFirstPage();
            }}
            searchQuery={searchQuery}
            status={status}
            statusOptions={followerStatusCatalog}
          />

      {query.isError ? (
        <ErrorState
          description="เกิดข้อผิดพลาดระหว่างโหลดรายการผู้สมัคร"
          onRetry={query.refetch}
          title="โหลดรายการผู้สมัครไม่สำเร็จ"
        />
      ) : query.isLoading ? (
        <SkeletonTable />
      ) : followers.length === 0 ? (
        <EmptyState
          description="ลองปรับตัวกรอง หรือค้นหาด้วยชื่อ/เบอร์โทรศัพท์อีกครั้ง"
          icon={UserCheck}
          title="ไม่พบรายการผู้สมัคร"
        />
      ) : null}

      {!query.isError && !query.isLoading && followers.length > 0 ? (
        <>
          <DataTable
            headings={["ผู้สมัคร", "เบอร์โทรศัพท์", "พื้นที่", "สถานะ", "วันที่สมัคร", "จัดการ"]}
            minWidthClassName="min-w-full"
            responsiveBreakpoint="lg"
          >
            {followers.map((follower) => {
              const statusMeta = getFieldFollowerStatusMeta(followerStatusCatalog, follower.status);
              return (
                <DataTableRow key={follower.id}>
                  <DataTableCell className="font-bold text-slate-900">
                    {getFieldFollowerFullName(follower)}
                  </DataTableCell>
                  <DataTableCell>{follower.phone}</DataTableCell>
                  <DataTableCell>
                    <div>{getFieldFollowerAreaText(follower)}</div>
                    {follower.campaign_name ? (
                      <div className="text-xs text-slate-400">ผ่านลิงก์ {follower.campaign_name}</div>
                    ) : null}
                  </DataTableCell>
                  <DataTableCell>
                    <Badge className="whitespace-nowrap" variant={statusMeta.variant}>
                      {statusMeta.label}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>{formatThaiDateTime(follower.created_at)}</DataTableCell>
                  <DataTableCell className="text-right">
                    <DetailLinkButton
                      aria-label="ดูรายละเอียด"
                      className="min-w-[128px]"
                      to={`/field-followers/${follower.id}`}
                    />
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTable>

          <TableCardList desktopBreakpoint="lg">
            {followers.map((follower) => {
              const statusMeta = getFieldFollowerStatusMeta(followerStatusCatalog, follower.status);
              return (
                <TableCard className="space-y-3" key={follower.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900">
                        {getFieldFollowerFullName(follower)}
                      </div>
                      <div className="text-sm text-slate-500">{follower.phone}</div>
                    </div>
                    <Badge className="shrink-0 whitespace-nowrap" variant={statusMeta.variant}>
                      {statusMeta.label}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-700">{getFieldFollowerAreaText(follower)}</div>
                  {follower.campaign_name ? (
                    <div className="text-xs text-slate-400">ผ่านลิงก์ {follower.campaign_name}</div>
                  ) : null}
                  <div className="text-sm text-slate-500">
                    สมัครเมื่อ {formatThaiDateTime(follower.created_at)}
                  </div>
                  <DetailLinkButton
                    aria-label="ดูรายละเอียด"
                    className="self-end"
                    to={`/field-followers/${follower.id}`}
                  />
                </TableCard>
              );
            })}
          </TableCardList>
        </>
      ) : null}

      {query.data ? (
        <Pagination
          onPageChange={setPage}
          onRowsPerPageChange={(nextRowsPerPage) =>
            setLimit(nextRowsPerPage as (typeof PAGE_SIZE_OPTIONS)[number])
          }
          page={page}
          rowsPerPage={limit}
          rowsPerPageOptions={PAGE_SIZE_OPTIONS}
          totalCount={query.data.meta.totalCount}
        />
      ) : null}
        </>
      )}
    </PageShell>
  );
}
