import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Clock, Link2, Lock } from "lucide-react";
import { Tabs, useConfirm } from "../../../components/base";
import { getLinkLockConfirm } from "../../../lib/link-lock";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useRouteTab } from "../../../hooks/useRouteTab";
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
import { SchoolAreaSchoolFilter } from "../../attendance/components/SchoolAreaSchoolFilter";
import { SchoolClassRoomFilter } from "../../attendance/components/SchoolClassRoomFilter";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { AuditLogPanel } from "../../audit-log/components/AuditLogPanel";
import { LoginLinkTable } from "../components/LoginLinkTable";
import { useLoginLinks, useSetLinkLock } from "../hooks/useLoginLinks";
import { isLoginLinkLocked } from "../lib/login-links-presentation";
import type { LoginLink, LoginLinkListQuery } from "../types/login-links.types";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";

const LOGIN_LINK_TAB_ROUTES = {
  manage: "/login-links",
  history: "/login-links/history",
} as const;

const LOGIN_LINK_AUDIT_ACTION_OPTIONS = [
  { value: "LINK_LOCK", label: "ปิดลิงก์" },
  { value: "LINK_UNLOCK", label: "เปิดลิงก์อีกครั้ง" },
] as const;

export function LoginLinksPage() {
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useRouteTab(LOGIN_LINK_TAB_ROUTES, "manage");
  const canViewAuditLog = can("audit-log");
  const effectiveTab = activeTab === "history" && canViewAuditLog ? "history" : "manage";
  const linkStateCatalog = useStatusCatalog("TASK_LINK_STATE");
  const linkStateOptions = linkStateCatalog.items.filter((item) =>
    ["SCHEDULED", "ACTIVE", "LOCKED", "EXPIRED"].includes(item.code),
  );
  const setLinkLock = useSetLinkLock();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const schoolArea = useSchoolAreaFilter();
  const scope = useScopeCascade({ lockToActorScope: true });

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);

  const query = useMemo<LoginLinkListQuery>(
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

  const { links, meta, summary, isLoading, isError, refetch } = useLoginLinks(query);
  const totalCount = meta?.totalCount ?? 0;
  const hasActiveFilter = Boolean(debouncedSearch) || status !== "ALL";

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

  async function handleToggleLock(link: LoginLink): Promise<void> {
    const locked = isLoginLinkLocked(link);
    const confirmed = await confirm(getLinkLockConfirm(locked));
    if (!confirmed) {
      return;
    }
    setLinkLock.mutate({
      linkId: link.id,
      payload: {
        action: locked ? "unlock" : "lock",
        reason: locked
          ? "เปิดลิงก์อีกครั้งโดยผู้ดูแลระบบ"
          : "ปิดลิงก์โดยผู้ดูแลระบบ",
      },
    });
  }

  return (
    <PageShell maxWidthClassName="max-w-[1100px]">
      <ListPageToolbar
        icon={Link2}
        title="ลิงก์เข้าสู่ระบบ"
        description={
          effectiveTab === "manage"
            ? "สร้างและจัดการลิงก์เข้าสู่ระบบสำหรับผู้รับสิทธิ์"
            : "ดูประวัติการเปิดและปิดลิงก์ย้อนหลังตามขอบเขตสิทธิ์"
        }
        actions={
          canViewAuditLog ? (
            <Tabs
              aria-label="โหมดจัดการลิงก์เข้าสู่ระบบ"
              onChange={setActiveTab}
              options={[
                { value: "manage", label: "จัดการลิงก์" },
                { value: "history", label: "ประวัติ" },
              ]}
              value={activeTab}
            />
          ) : undefined
        }
        tableActions={
          effectiveTab === "manage" ? (
            <div className="flex gap-2">
              <RefreshButton onRefresh={refetch} />
            </div>
          ) : undefined
        }
        search={
          effectiveTab === "manage"
            ? {
                value: searchQuery,
                onChange: handleSearchChange,
                placeholder: "ค้นหาชื่อ อีเมล ตำแหน่ง หรือสถานะ...",
              }
            : undefined
        }
        filters={
          effectiveTab === "manage" ? (
            <>
              <SchoolClassRoomFilter
                area={schoolArea}
                onGradeChange={handleGradeChange}
                onRoomChange={handleRoomChange}
                onSchoolChange={handleSchoolChange}
                scope={scope}
              />
              <FilterSelect
                ariaLabel="สถานะลิงก์เข้าสู่ระบบ"
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
          ) : (
            <SchoolAreaSchoolFilter
              area={schoolArea}
              onSchoolChange={handleSchoolChange}
              schoolId={scope.schoolId}
              schoolLocked={scope.schoolLocked}
            />
          )
        }
      />

      {effectiveTab === "manage" ? (
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
            }))}
          />

          {isError || linkStateCatalog.isError ? (
            <ErrorState
              title="ไม่สามารถโหลดลิงก์ได้"
              description="เกิดข้อผิดพลาดระหว่างโหลดรายการลิงก์เข้าสู่ระบบ"
              onRetry={() => {
                refetch();
                linkStateCatalog.refetch();
              }}
            />
          ) : isLoading || linkStateCatalog.isLoading ? (
            <SkeletonTable />
          ) : links.length === 0 ? (
            <EmptyState
              icon={Link2}
              title={hasActiveFilter ? "ไม่พบลิงก์ที่ค้นหา" : "ยังไม่มีลิงก์เข้าสู่ระบบ"}
              description={
                hasActiveFilter
                  ? "ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ"
                  : "กดปุ่ม “สร้างลิงก์” เพื่อสร้างลิงก์เข้าสู่ระบบใหม่"
              }
            />
          ) : (
            <>
              <LoginLinkTable links={links} onToggleLock={handleToggleLock} />
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
      ) : (
        <AuditLogPanel
          actionOptions={LOGIN_LINK_AUDIT_ACTION_OPTIONS}
          description="ดูประวัติการเปิดและปิดลิงก์เข้าสู่ระบบย้อนหลังตามขอบเขตสิทธิ์"
          district={schoolArea.district || undefined}
          domain="login_links"
          province={schoolArea.province || undefined}
          schoolId={scope.schoolId ? Number(scope.schoolId) : undefined}
          subDistrict={schoolArea.subDistrict || undefined}
          title="ประวัติลิงก์เข้าสู่ระบบ"
        />
      )}

      {confirmDialog}
    </PageShell>
  );
}
