import { useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Link2,
  Lock,
  LockOpen,
} from "lucide-react";
import { Button, Tabs, useConfirm } from "../../../components/base";
import { getLinkLockConfirm } from "../../../lib/link-lock";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { LinkStatusBadge } from "../../../components/layout/link-status-badge";
import { LinkTimeHeader, LinkTimeSummary } from "../../../components/layout/link-time-summary";
import { Pagination } from "../../../components/layout/pagination";
import {
  ErrorState,
  FilterSelect,
  ListPageToolbar,
  PageShell,
  SkeletonTable,
  SummaryMetrics,
} from "../../../components/layout/page-primitives";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { attendanceService } from "../../attendance/api/attendance.service";
import { SchoolAreaSchoolFilter } from "../../attendance/components/SchoolAreaSchoolFilter";
import { SchoolClassRoomFilter } from "../../attendance/components/SchoolClassRoomFilter";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { AuditLogPanel } from "../../audit-log/components/AuditLogPanel";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { loginLinksService } from "../../login-links/api/login-links.service";
import type {
  AttendanceTask,
  AttendanceTaskLinkStatus,
  AttendanceTaskListQuery,
  AttendanceTaskSummary,
} from "../../attendance/types/attendance.types";
import { isLinkLocked } from "../lib/task-presentation";
import {
  findStatusCatalogItem,
  useStatusCatalog,
} from "../../status-catalog/hooks/useStatusCatalog";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";

const EMPTY_SUMMARY: AttendanceTaskSummary = {
  total: 0,
  active: 0,
  locked: 0,
  expired: 0,
  scheduled: 0,
};

const ATTENDANCE_LINK_TAB_ROUTES = {
  list: "/attendance-links",
  history: "/attendance-links/history",
} as const;

const ATTENDANCE_LINK_AUDIT_ACTION_OPTIONS = [
  { value: "TASK_CREATE", label: "สร้างภารกิจหรือลิงก์" },
  { value: "LINK_LOCK", label: "ปิดลิงก์" },
  { value: "LINK_UNLOCK", label: "เปิดลิงก์อีกครั้ง" },
  { value: "TASK_DELETE", label: "ลบภารกิจ" },
] as const;

function getLinkState(
  task: AttendanceTask,
): Exclude<AttendanceTaskLinkStatus, "ALL"> {
  if (
    task.link_state === "ACTIVE" ||
    task.link_state === "LOCKED" ||
    task.link_state === "EXPIRED" ||
    task.link_state === "SCHEDULED"
  ) {
    return task.link_state;
  }
  if (!task.active_link) return "EXPIRED";
  const expiresAt = task.active_link_expires_at
    ? new Date(task.active_link_expires_at)
    : null;
  if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
    return "EXPIRED";
  }
  if (isLinkLocked(task.active_link_locked)) return "LOCKED";
  return "ACTIVE";
}

function AttendanceLinkStateBadge({
  catalog,
  task,
}: {
  catalog: readonly StatusCatalogItem[];
  task: AttendanceTask;
}) {
  const linkState = getLinkState(task);
  const item = findStatusCatalogItem(catalog, linkState);
  return (
    <LinkStatusBadge
      label={item?.label ?? linkState}
      variant={item?.badgeVariant ?? "secondary"}
    />
  );
}

function compareText(a: string | undefined, b: string | undefined): number {
  return (a || "").localeCompare(b || "", "th");
}

function getAttendanceTaskSortValue(task: AttendanceTask, key: string): string {
  if (key === "class") return `${task.target_grade || ""}/${task.target_room || ""}`;
  if (key === "school") return task.target_school_name || "";
  if (key === "assignee") return task.link_assigned_to || "";
  if (key === "status") return getLinkState(task);
  if (key === "starts") return task.active_link_created_at || task.created_at || "";
  if (key === "expires") return task.active_link_expires_at || "";
  if (key === "remaining") return task.active_link_expires_at || "";
  return "";
}

export function AttendanceLinksDashboardPage() {
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useRouteTab(ATTENDANCE_LINK_TAB_ROUTES, "list");
  const canViewAuditLog = can("audit-log");
  const effectiveTab = activeTab === "history" && canViewAuditLog ? "history" : "list";
  const linkStateCatalog = useStatusCatalog("TASK_LINK_STATE");
  const linkStateOptions = linkStateCatalog.items.filter((item) =>
    ["SCHEDULED", "ACTIVE", "LOCKED", "EXPIRED"].includes(item.code),
  );
  const [status, setStatus] = useState<AttendanceTaskLinkStatus>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const schoolArea = useSchoolAreaFilter();
  const scope = useScopeCascade({ lockToActorScope: true });
  const queryClient = useQueryClient();
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const query = useMemo<AttendanceTaskListQuery>(
    () => ({
      status,
      searchTerm: debouncedSearch || undefined,
      province: schoolArea.province || undefined,
      district: schoolArea.district || undefined,
      subDistrict: schoolArea.subDistrict || undefined,
      schoolId: scope.schoolId || undefined,
      grade: scope.grade || undefined,
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
      scope.grade,
      scope.room,
      page,
      rowsPerPage,
    ],
  );
  const tasksQuery = useQuery({
    queryKey: ["attendance-link-tasks", query],
    queryFn: () => attendanceService.getAttendanceTasksPage(query),
    placeholderData: keepPreviousData,
  });
  const setLock = useMutation({
    mutationFn: ({ id, locked }: { id: string; locked: boolean }) =>
      loginLinksService.setLinkAdminLock(id, {
        action: locked ? "lock" : "unlock",
        reason: locked ? "ปิดลิงก์จากแดชบอร์ดเช็คชื่อ" : "",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["attendance-link-tasks"] });
    },
  });
  // Only the row currently mutating should show the spinner — a shared pending
  // flag would spin every lock button at once and reflow the whole column.
  const pendingLinkId = setLock.isPending ? setLock.variables?.id : undefined;
  const { confirm, dialog: confirmDialog } = useConfirm();

  function handleSearchChange(value: string): void {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: string): void {
    setStatus(value as AttendanceTaskLinkStatus);
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

  async function handleToggleLock(linkId: string, locked: boolean): Promise<void> {
    const confirmed = await confirm(getLinkLockConfirm(locked));
    if (!confirmed) {
      return;
    }
    setLock.mutate({ id: linkId, locked: !locked });
  }

  const tasks = useMemo(() => tasksQuery.data?.rows ?? [], [tasksQuery.data?.rows]);
  const sortedTasks = useMemo(() => {
    if (!sort) return tasks;
    return [...tasks].sort((a, b) => {
      const result = compareText(
        getAttendanceTaskSortValue(a, sort.key),
        getAttendanceTaskSortValue(b, sort.key),
      );
      return sort.direction === "asc" ? result : -result;
    });
  }, [tasks, sort]);
  const totalCount = tasksQuery.data?.totalCount ?? 0;
  const summary = tasksQuery.data?.summary ?? EMPTY_SUMMARY;

  return (
    <PageShell>
      {effectiveTab === "list" ? (
        <ListPageToolbar
          actions={
            canViewAuditLog ? (
              <Tabs
                aria-label="โหมดลิงก์เช็คชื่อ"
                onChange={setActiveTab}
                options={[
                  { value: "list", label: "รายการ" },
                  { value: "history", label: "ประวัติ" },
                ]}
                value={activeTab}
              />
            ) : undefined
          }
          icon={ClipboardCheck}
          title="ลิงก์เช็คชื่อ"
          description="ตรวจสอบลิงก์เช็คชื่อรายชั้นและปิดหรือเปิดใช้งานได้ทันที"
          tableActions={
            <div className="flex flex-wrap gap-2">
              <RefreshButton onRefresh={() => tasksQuery.refetch()} />
            </div>
          }
          search={{
            value: search,
            onChange: handleSearchChange,
            placeholder: "ค้นหาชั้น โรงเรียน หรือผู้รับผิดชอบ",
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
                ariaLabel="สถานะลิงก์เช็คชื่อ"
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
              aria-label="โหมดลิงก์เช็คชื่อ"
              onChange={setActiveTab}
              options={[
                { value: "list", label: "รายการ" },
                { value: "history", label: "ประวัติ" },
              ]}
              value={activeTab}
            />
          }
          description="ดูประวัติการสร้าง ปิด และเปิดลิงก์เช็คชื่อย้อนหลังตามขอบเขตสิทธิ์"
          filters={
            <SchoolAreaSchoolFilter
              area={schoolArea}
              onSchoolChange={handleSchoolChange}
              schoolId={scope.schoolId}
              schoolLocked={scope.schoolLocked}
            />
          }
          icon={ClipboardCheck}
          title="ลิงก์เช็คชื่อ"
        />
      )}

      {effectiveTab === "history" ? (
        <AuditLogPanel
          actionOptions={ATTENDANCE_LINK_AUDIT_ACTION_OPTIONS}
          description="ดูประวัติการสร้าง ปิด และเปิดลิงก์เช็คชื่อย้อนหลังตามขอบเขตสิทธิ์"
          district={schoolArea.district || undefined}
          domain="tasks"
          province={schoolArea.province || undefined}
          schoolId={scope.schoolId ? Number(scope.schoolId) : undefined}
          subDistrict={schoolArea.subDistrict || undefined}
          taskType="ATTENDANCE"
          title="ประวัติลิงก์เช็คชื่อ"
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
            }))}
          />

        {tasksQuery.isError || linkStateCatalog.isError ? (
          <ErrorState
            title="ไม่สามารถโหลดข้อมูลลิงก์เช็คชื่อได้"
            description="ตรวจสอบสิทธิ์หรือการเชื่อมต่อ backend แล้วลองอีกครั้ง"
            onRetry={() => {
              void tasksQuery.refetch();
              linkStateCatalog.refetch();
            }}
          />
        ) : tasksQuery.isLoading || linkStateCatalog.isLoading ? (
          <SkeletonTable />
        ) : (
          <>
            <DataTable
              headings={[
                { label: "ชั้นเรียน", sortKey: "class" },
                { label: "โรงเรียน", sortKey: "school" },
                { label: "ผู้รับลิงก์", sortKey: "assignee" },
                { label: "สถานะ", sortKey: "status" },
                { label: <LinkTimeHeader onSortChange={setSort} sort={sort} /> },
                "จัดการ",
              ]}
              columnWidths={[
                "w-[10%]",
                "w-[16%]",
                "w-[17%]",
                "w-[12%]",
                "w-[27%]",
                "w-[18%]",
              ]}
              minWidthClassName="min-w-full"
              onSortChange={setSort}
              responsive={false}
              sort={sort}
              footer={
                tasks.length === 0 ? (
                  <div className="border-t border-slate-100 py-12 text-center text-slate-500">
                    ไม่พบลิงก์เช็คชื่อตามตัวกรอง
                  </div>
                ) : null
              }
            >
              {sortedTasks.map((task) => {
                const locked = isLinkLocked(task.active_link_locked);
                const linkState = getLinkState(task);
                const canToggleLink = task.active_link_id && linkState !== "EXPIRED";
                return (
                  <DataTableRow key={task.task_id}>
                    <DataTableCell className="font-bold">
                      {task.target_grade || "-"} / {task.target_room || "-"}
                    </DataTableCell>
                    <DataTableCell className="text-sm">
                      {task.target_school_name || "-"}
                    </DataTableCell>
                    <DataTableCell className="text-sm">
                      <div className="font-bold text-slate-800">
                        {task.link_assigned_to || "-"}
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <AttendanceLinkStateBadge catalog={linkStateCatalog.items} task={task} />
                    </DataTableCell>
                    <DataTableCell>
                      <LinkTimeSummary
                        expiresAt={task.active_link_expires_at}
                        startsAt={task.active_link_created_at ?? task.created_at}
                        variant="columns"
                      />
                    </DataTableCell>
                    <DataTableCell className="pr-3">
                      <div className="flex flex-nowrap items-center justify-end gap-2">
                        {task.active_link_id ? (
                          <DetailLinkButton
                            aria-label="ดูรายละเอียด"
                            className="min-w-[128px]"
                            state={{ date: task.created_at?.split("T")[0] }}
                            to={`/attendance-links/${task.active_link_id}`}
                          />
                        ) : null}
                        {canToggleLink ? (
                          <Button
                            aria-label={locked ? "เปิดลิงก์" : "ปิดลิงก์"}
                            className="size-9 shrink-0 px-0"
                            icon={locked ? LockOpen : Lock}
                            isLoading={pendingLinkId === task.active_link_id}
                            onClick={() =>
                              void handleToggleLock(task.active_link_id || "", locked)
                            }
                            size="sm"
                            variant={locked ? "outline" : "destructive"}
                          />
                        ) : (
                          <span className="size-9 shrink-0" aria-hidden="true" />
                        )}
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTable>
            {totalCount > 0 ? (
              <Pagination
                onPageChange={setPage}
                onRowsPerPageChange={handleRowsPerPageChange}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                totalCount={totalCount}
                unitLabel="ลิงก์"
              />
            ) : null}
          </>
        )}
        </div>
      )}
      {confirmDialog}
    </PageShell>
  );
}
