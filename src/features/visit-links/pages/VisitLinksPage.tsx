import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Clock, Link2, Lock, MapPin } from "lucide-react";
import { Tabs } from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  ListPageToolbar,
  PageShell,
  SkeletonTable,
  SummaryMetrics,
} from "../../../components/layout/page-primitives";
import { Pagination } from "../../../components/layout/pagination";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { SchoolClassRoomFilter } from "../../attendance/components/SchoolClassRoomFilter";
import { SchoolAreaSchoolFilter } from "../../attendance/components/SchoolAreaSchoolFilter";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { AuditLogPanel } from "../../audit-log/components/AuditLogPanel";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import { VisitLinkTable } from "../components/VisitLinkTable";
import { useVisitLinks } from "../hooks/useVisitLinks";
import type { VisitLinkListQuery } from "../types/visit-links.types";
import { useRouteTab } from "../../../hooks/useRouteTab";

const VISIT_LINK_TAB_ROUTES = {
  list: "/visit-links",
  history: "/visit-links/history",
} as const;

export function VisitLinksPage() {
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useRouteTab(VISIT_LINK_TAB_ROUTES, "list");
  const canViewAuditLog = can("audit-log");
  const effectiveTab = activeTab === "history" && canViewAuditLog ? "history" : "list";
  const linkStateCatalog = useStatusCatalog("TASK_LINK_STATE");
  const linkStateOptions = linkStateCatalog.items.filter((item) =>
    ["SCHEDULED", "ACTIVE", "LOCKED", "EXPIRED"].includes(item.code),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const schoolArea = useSchoolAreaFilter();
  const scope = useScopeCascade({ lockToActorScope: true });

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);

  const query = useMemo<VisitLinkListQuery>(
    () => ({
      status,
      searchTerm: debouncedSearch || undefined,
      province: schoolArea.province || undefined,
      district: schoolArea.district || undefined,
      subDistrict: schoolArea.subDistrict || undefined,
      schoolId: scope.schoolId || undefined,
      gradeLevelId: scope.gradeLevelId,
      room: scope.room || undefined,
      page,
      limit: rowsPerPage,
    }),
    [
      status,
      debouncedSearch,
      schoolArea.province,
      schoolArea.district,
      schoolArea.subDistrict,
      scope.schoolId,
      scope.gradeLevelId,
      scope.room,
      page,
      rowsPerPage,
    ],
  );

  const { links, meta, summary, isLoading, isError, refetch, dataUpdatedAt } = useVisitLinks(query);
  const totalCount = meta?.totalCount ?? 0;
  const hasActiveFilter =
    Boolean(debouncedSearch) ||
    status !== "ALL" ||
    Boolean(schoolArea.province) ||
    Boolean(schoolArea.district) ||
    Boolean(schoolArea.subDistrict) ||
    Boolean(scope.schoolId) ||
    Boolean(scope.grade) ||
    Boolean(scope.room);

  function handleSearchChange(value: string): void {
    setSearchQuery(value);
    setPage(1);
  }

  function handleStatusChange(value: string): void {
    setStatus(value);
    setPage(1);
  }

  function handleSchoolChange(value: string): void {
    scope.setSchoolId(value);
    setPage(1);
  }

  function handleGradeChange(value: string): void {
    scope.setGrade(value);
    setPage(1);
  }

  function handleRoomChange(value: string): void {
    scope.setRoom(value);
    setPage(1);
  }

  function handleRowsPerPageChange(value: number): void {
    setRowsPerPage(value);
    setPage(1);
  }

  function handleClearFilters(): void {
    setSearchQuery("");
    setStatus("ALL");
    schoolArea.reset();
    scope.reset();
    setPage(1);
  }

  return (
    <PageShell>
      {effectiveTab === "list" ? (
        <ListPageToolbar
          actions={
            canViewAuditLog ? (
              <Tabs
                aria-label="โหมดลิงก์ลงพื้นที่"
                onChange={setActiveTab}
                options={[
                  { value: "list", label: "รายการ" },
                  { value: "history", label: "ประวัติ" },
                ]}
                value={activeTab}
              />
            ) : undefined
          }
          icon={MapPin}
          onClearFilters={handleClearFilters}
          title="ลิงก์ลงพื้นที่"
          description="ดูและจัดการลิงก์ภารกิจลงพื้นที่ตามขอบเขตเคสที่ได้รับสิทธิ์"
          tableActions={
            <div className="flex gap-2">
              <RefreshButton onRefresh={refetch} updatedAt={dataUpdatedAt} />
            </div>
          }
          search={{
            value: searchQuery,
            onChange: handleSearchChange,
            placeholder: "ค้นหานักเรียน โรงเรียน ผู้รับมอบหมาย หรืออีเมล...",
          }}
          filters={
            <>
              <SchoolClassRoomFilter
                area={schoolArea}
                onGradeChange={handleGradeChange}
                onRoomChange={handleRoomChange}
                onSchoolChange={handleSchoolChange}
                scope={scope}
              />
              <FilterSelect
                ariaLabel="สถานะลิงก์ลงพื้นที่"
                className="sm:w-[220px]"
                onChange={handleStatusChange}
                value={status}
              >
                <option value="ALL">ทั้งหมด</option>
                {linkStateOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </FilterSelect>
            </>
          }
        />
      ) : (
        <ListPageToolbar
          actions={
            <Tabs
              aria-label="โหมดลิงก์ลงพื้นที่"
              onChange={setActiveTab}
              options={[
                { value: "list", label: "รายการ" },
                { value: "history", label: "ประวัติ" },
              ]}
              value={activeTab}
            />
          }
          description="ดูประวัติการสร้าง ปิด และเปิดลิงก์ลงพื้นที่ย้อนหลังตามขอบเขตสิทธิ์"
          onClearFilters={handleClearFilters}
          filters={
            <SchoolAreaSchoolFilter
              area={schoolArea}
              onSchoolChange={handleSchoolChange}
              schoolId={scope.schoolId}
              schoolLocked={scope.schoolLocked}
            />
          }
          icon={MapPin}
          title="ลิงก์ลงพื้นที่"
        />
      )}

      {effectiveTab === "history" ? (
        <AuditLogPanel
          description="ดูประวัติการสร้าง ปิด และเปิดลิงก์ลงพื้นที่ย้อนหลังตามขอบเขตสิทธิ์"
          district={schoolArea.district || undefined}
          domain="tasks"
          province={schoolArea.province || undefined}
          schoolId={scope.schoolId ? Number(scope.schoolId) : undefined}
          subDistrict={schoolArea.subDistrict || undefined}
          taskType="VISIT"
          title="ประวัติลิงก์ลงพื้นที่"
        />
      ) : (
        <div className="space-y-5">
        <SummaryMetrics
          centerRows
          items={[
            { code: "ALL", label: "ทั้งหมด", badgeVariant: "secondary" as const },
            ...linkStateOptions,
          ].map((option) => ({
            label: option.label,
            value:
              option.code === "ACTIVE"
                ? summary.active
                : option.code === "LOCKED"
                  ? summary.locked
                  : option.code === "EXPIRED"
                    ? summary.expired
                    : option.code === "SCHEDULED"
                      ? summary.scheduled
                      : summary.total,
            tone:
              option.badgeVariant === "success"
                ? "success"
                : option.badgeVariant === "warning"
                  ? "warning"
                  : option.badgeVariant === "destructive"
                    ? "danger"
                    : "default",
            icon:
              option.code === "ACTIVE"
                ? CheckCircle2
                : option.code === "LOCKED"
                  ? Lock
                  : option.code === "EXPIRED"
                    ? Clock
                    : option.code === "SCHEDULED"
                      ? CalendarClock
                      : Link2,
            onSelect: () =>
              handleStatusChange(
                status === option.code && option.code !== "ALL" ? "ALL" : option.code,
              ),
            selected: status === option.code,
            selectionLabel:
              option.code === "ALL"
                ? "แสดงลิงก์ลงพื้นที่ทุกสถานะ"
                : `${status === option.code ? "ยกเลิกตัวกรอง" : "กรอง"}${option.label}`,
          }))}
        />

        {isError || linkStateCatalog.isError ? (
          <ErrorState
            title="ไม่สามารถโหลดลิงก์ลงพื้นที่ได้"
            description="เกิดข้อผิดพลาดระหว่างโหลดรายการลิงก์ลงพื้นที่"
            onRetry={() => {
              refetch();
              linkStateCatalog.refetch();
            }}
          />
        ) : isLoading || linkStateCatalog.isLoading ? (
          <SkeletonTable />
        ) : links.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title={hasActiveFilter ? "ไม่พบลิงก์ที่ค้นหา" : "ยังไม่มีลิงก์ลงพื้นที่"}
            description={
              hasActiveFilter
                ? "ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ"
                : "สร้างลิงก์จากหน้าเคสช่วยเหลือเมื่อพร้อมมอบหมายงานลงพื้นที่"
            }
          />
        ) : (
          <>
            <VisitLinkTable links={links} />
            <Pagination
              onPageChange={setPage}
              onRowsPerPageChange={handleRowsPerPageChange}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={PAGE_SIZE_OPTIONS}
              totalCount={totalCount}
              unitLabel="ลิงก์"
            />
          </>
        )}
        </div>
      )}
    </PageShell>
  );
}
