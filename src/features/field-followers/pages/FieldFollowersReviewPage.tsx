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
  type DataTableSortState,
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
  type FieldFollowerSortKey,
  type FieldFollowerStatus,
} from "../types/field-follower.types";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const FIELD_FOLLOWERS_TAB_ROUTES = {
  links: "/field-followers",
  history: "/field-followers/history",
  review: "/field-follower-applications",
  reviewHistory: "/field-follower-applications/history",
} as const;

const LINK_TAB_OPTIONS = [
  { value: "links", label: "ลิงก์รับสมัคร" },
  { value: "history", label: "ประวัติ" },
];

const REVIEW_TAB_OPTIONS = [
  { value: "review", label: "ตรวจสอบใบสมัคร" },
  { value: "reviewHistory", label: "ประวัติ" },
];

export function FieldFollowersReviewPage() {
  const [activeTab, setActiveTab] = useRouteTab(FIELD_FOLLOWERS_TAB_ROUTES, "links");
  const [status, setStatus] = useState<FieldFollowerStatus | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);
  const [sort, setSort] = useState<DataTableSortState>();
  const area = useSchoolAreaFilter();
  const followerStatusCatalog = useStatusCatalog("FIELD_FOLLOWER_STATUS").items;

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);
  const query = useFieldFollowers({
    status: status || undefined,
    province: area.province || undefined,
    district: area.district || undefined,
    subDistrict: area.subDistrict || undefined,
    searchTerm: debouncedSearch || undefined,
    sortBy: sort?.key as FieldFollowerSortKey | undefined,
    sortDirection: sort?.direction,
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

  function handleClearReviewFilters(): void {
    setSearchQuery("");
    setStatus("");
    area.reset();
    setPage(1);
  }

  return (
    <PageShell>
      {activeTab === "links" ? (
        <>
          <FollowerRecruitmentCampaignsSection
            navigation={
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
            navigation={
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
            actionValues={[
              "FOLLOWER_CAMPAIGN_CREATE",
              "FOLLOWER_CAMPAIGN_UPDATE",
              "FOLLOWER_CAMPAIGN_DELETE",
              "FOLLOWER_CAMPAIGN_TARGETS_ADD",
            ]}
            description="ดูประวัติการสร้าง แก้ไข เปิด-ปิด และลบลิงก์รับสมัครย้อนหลัง"
            domain="field_followers"
            targetType="follower_recruitment_campaign"
            title="ประวัติลิงก์รับสมัคร"
          />
        </>
      ) : activeTab === "reviewHistory" ? (
        <>
          <ListPageToolbar
            navigation={
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
            navigation={
              <Tabs
                aria-label="โหมดผู้สมัคร อสม./ผู้ติดตาม"
                onChange={setActiveTab}
                options={REVIEW_TAB_OPTIONS}
                value={activeTab}
              />
            }
            area={area}
            onClearFilters={handleClearReviewFilters}
            onRefresh={query.refetch}
            updatedAt={query.dataUpdatedAt}
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
            headings={[
              { label: "ผู้สมัคร", sortKey: "applicant" },
              { label: "เบอร์โทรศัพท์", sortKey: "phone" },
              { label: "พื้นที่", sortKey: "area" },
              { label: "สถานะ", sortKey: "status" },
              { label: "วันที่สมัคร", sortKey: "createdAt" },
              "",
            ]}
            minWidthClassName="min-w-full"
            onSortChange={(nextSort) => {
              setSort(nextSort);
              setPage(1);
            }}
            responsiveBreakpoint="lg"
            sort={sort}
          >
            {followers.map((follower) => {
              const statusMeta = getFieldFollowerStatusMeta(followerStatusCatalog, follower.status);
              return (
                <DataTableRow key={follower.id}>
                  <DataTableCell className="text-slate-900">
                    {getFieldFollowerFullName(follower)}
                  </DataTableCell>
                  <DataTableCell>{follower.phone}</DataTableCell>
                  <DataTableCell>
                    <div>{getFieldFollowerAreaText(follower)}</div>
                    {follower.campaign_name ? (
                      <div className="text-xs text-slate-500">ผ่านลิงก์ {follower.campaign_name}</div>
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
                      <div className="text-slate-900">
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
                    <div className="text-xs text-slate-500">ผ่านลิงก์ {follower.campaign_name}</div>
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
