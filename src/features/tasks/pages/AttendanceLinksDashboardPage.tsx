import { useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CheckCircle2,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Link2,
  Lock,
  LockOpen,
  Plus,
} from "lucide-react";
import { Button, useConfirm } from "../../../components/base";
import { getLinkLockConfirm } from "../../../lib/link-lock";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { NavButton } from "../../../components/layout/nav-button";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { LinkStatusBadge } from "../../../components/layout/link-status-badge";
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
import { SchoolClassRoomFilter } from "../../attendance/components/SchoolClassRoomFilter";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { loginLinksService } from "../../login-links/api/login-links.service";
import type {
  AttendanceTask,
  AttendanceTaskLinkStatus,
  AttendanceTaskListQuery,
  AttendanceTaskSummary,
} from "../../attendance/types/attendance.types";
import { formatDateTime, isLinkLocked } from "../lib/task-presentation";
import { LINK_STATE_OPTIONS } from "../lib/task-options";

const EMPTY_SUMMARY: AttendanceTaskSummary = {
  total: 0,
  active: 0,
  locked: 0,
  expired: 0,
};

function getLinkState(
  task: AttendanceTask,
): Exclude<AttendanceTaskLinkStatus, "ALL"> {
  if (isLinkLocked(task.active_link_locked)) return "LOCKED";
  if (!task.active_link) return "EXPIRED";
  return "ACTIVE";
}

function LinkStateBadge({ task }: { task: AttendanceTask }) {
  const state = getLinkState(task);
  if (state === "LOCKED") return <LinkStatusBadge label="ถูกปิด" variant="destructive" />;
  if (state === "EXPIRED") return <LinkStatusBadge label="ไม่มีลิงก์" variant="secondary" />;
  return <LinkStatusBadge label="ใช้งานได้" variant="success" />;
}

function compareText(a: string | undefined, b: string | undefined): number {
  return (a || "").localeCompare(b || "", "th");
}

function getAttendanceTaskSortValue(task: AttendanceTask, key: string): string {
  if (key === "class") return `${task.target_grade || ""}/${task.target_room || ""}`;
  if (key === "school") return task.target_school_name || "";
  if (key === "assignee") return task.link_assigned_to || "";
  if (key === "status") return getLinkState(task);
  if (key === "created") return task.created_at || "";
  return "";
}

export function AttendanceLinksDashboardPage() {
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
      schoolId: scope.schoolId || undefined,
      grade: scope.grade || undefined,
      room: scope.room || undefined,
      page,
      limit: rowsPerPage,
    }),
    [status, debouncedSearch, scope.schoolId, scope.grade, scope.room, page, rowsPerPage],
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
      <ListPageToolbar
        icon={ClipboardCheck}
        title="ลิงก์เช็คชื่อ"
        description="ตรวจสอบลิงก์เช็คชื่อรายชั้นและปิดหรือเปิดใช้งานได้ทันที"
        actions={
          <div className="flex flex-wrap gap-2">
            <RefreshButton onRefresh={() => tasksQuery.refetch()} />
            <NavButton icon={CalendarDays} to="/attendance-operations">
              ความครบถ้วน
            </NavButton>
            <NavButton icon={Plus} to="/create">
              สร้างลิงก์
            </NavButton>
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
              {LINK_STATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FilterSelect>
          </>
        }
      />

      <div className="space-y-5">
        <SummaryMetrics
          items={[
            { label: "ทั้งหมด", value: summary.total, tone: "default", icon: Link2 },
            { label: "ใช้งานได้", value: summary.active, tone: "success", icon: CheckCircle2 },
            { label: "ถูกปิด", value: summary.locked, tone: "danger", icon: Lock },
            { label: "ไม่มีลิงก์", value: summary.expired, tone: "warning", icon: Clock },
          ]}
        />

        {tasksQuery.isError ? (
          <ErrorState
            title="ไม่สามารถโหลดข้อมูลลิงก์เช็คชื่อได้"
            description="ตรวจสอบสิทธิ์หรือการเชื่อมต่อ backend แล้วลองอีกครั้ง"
            onRetry={() => void tasksQuery.refetch()}
          />
        ) : tasksQuery.isLoading ? (
          <SkeletonTable />
        ) : (
          <>
            <DataTable
              headings={[
                { label: "ชั้นเรียน", sortKey: "class" },
                { label: "โรงเรียน", sortKey: "school" },
                { label: "ผู้รับผิดชอบ", sortKey: "assignee" },
                { label: "สถานะ", sortKey: "status" },
                { label: "สร้างเมื่อ", sortKey: "created" },
                "จัดการ",
              ]}
              columnWidths={[
                "w-[13%]",
                "w-[18%]",
                "w-[18%]",
                "w-[11%]",
                "w-[15%]",
                "w-[25%]",
              ]}
              minWidthClassName="min-w-[900px]"
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
                return (
                  <DataTableRow key={task.task_id}>
                    <DataTableCell className="font-bold">
                      {task.target_grade || "-"} / {task.target_room || "-"}
                    </DataTableCell>
                    <DataTableCell className="text-sm">
                      {task.target_school_name || "-"}
                    </DataTableCell>
                    <DataTableCell className="text-sm">
                      {task.link_assigned_to || "-"}
                    </DataTableCell>
                    <DataTableCell>
                      <LinkStateBadge task={task} />
                    </DataTableCell>
                    <DataTableCell className="text-sm text-slate-500">
                      {formatDateTime(task.created_at)}
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex flex-nowrap items-center justify-end gap-3">
                        {task.active_link_id ? (
                          <DetailLinkButton
                            state={{ date: task.created_at?.split("T")[0] }}
                            to={`/attendance-links/${task.active_link_id}`}
                          />
                        ) : null}
                        {task.active_link_id ? (
                          <Button
                            // Fixed min width so toggling "เปิด"/"ปิด" (different glyph
                            // counts) never changes the button width and shifts the
                            // copy button beside it.
                            className="min-w-[88px]"
                            icon={locked ? LockOpen : Lock}
                            isLoading={pendingLinkId === task.active_link_id}
                            onClick={() =>
                              void handleToggleLock(task.active_link_id || "", locked)
                            }
                            size="sm"
                            variant={locked ? "outline" : "destructive"}
                          >
                            {locked ? "เปิด" : "ปิด"}
                          </Button>
                        ) : null}
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
      {confirmDialog}
    </PageShell>
  );
}
