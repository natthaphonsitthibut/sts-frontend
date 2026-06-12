import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Lock, LockOpen, Plus } from "lucide-react";
import { Badge, Button, useConfirm } from "../../../components/base";
import { getLinkLockConfirm } from "../../../lib/link-lock";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { NavButton } from "../../../components/layout/nav-button";
import {
  ErrorState,
  FilterSelect,
  PageShell,
  PageToolbar,
  SearchInput,
  SkeletonTable,
  SummaryMetrics,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
} from "../../../components/layout/data-table";
import { attendanceService } from "../../attendance/api/attendance.service";
import { loginLinksService } from "../../login-links/api/login-links.service";
import type { AttendanceTask } from "../../attendance/types/attendance.types";
import { formatDateTime, isLinkLocked } from "../lib/task-presentation";
import { LINK_STATE_OPTIONS } from "../lib/task-options";

function getLinkState(task: AttendanceTask): "ACTIVE" | "LOCKED" | "EXPIRED" {
  if (isLinkLocked(task.active_link_locked)) return "LOCKED";
  if (!task.active_link) return "EXPIRED";
  return "ACTIVE";
}

/** The raw token is the last segment of the shared link path (".../task/<token>"). */
function linkToken(activeLink: string | null): string {
  return activeLink?.split("/").filter(Boolean).pop() ?? "";
}

function LinkStateBadge({ task }: { task: AttendanceTask }) {
  const state = getLinkState(task);
  if (state === "LOCKED") return <Badge variant="warning">ถูกล็อก</Badge>;
  if (state === "EXPIRED") return <Badge variant="secondary">ไม่มีลิงก์</Badge>;
  return <Badge variant="success">ใช้งานได้</Badge>;
}

export function AttendanceLinksDashboardPage() {
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const tasksQuery = useQuery({
    queryKey: ["attendance-link-tasks"],
    queryFn: attendanceService.getTasks,
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

  async function handleToggleLock(linkId: string, locked: boolean): Promise<void> {
    const confirmed = await confirm(getLinkLockConfirm(locked));
    if (!confirmed) {
      return;
    }
    setLock.mutate({ id: linkId, locked: !locked });
  }

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (status !== "ALL" && getLinkState(task) !== status) return false;
      if (!query) return true;
      return [
        task.target_grade,
        task.target_room,
        task.target_school_name,
        task.link_assigned_to,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [status, search, tasks]);
  const summary = useMemo(
    () => ({
      total: tasks.length,
      active: tasks.filter((task) => getLinkState(task) === "ACTIVE").length,
      locked: tasks.filter((task) => getLinkState(task) === "LOCKED").length,
      expired: tasks.filter((task) => getLinkState(task) === "EXPIRED").length,
    }),
    [tasks],
  );

  return (
    <PageShell>
      <PageToolbar
        icon={ClipboardCheck}
        title="ลิงก์เช็คชื่อ"
        description="ตรวจสอบลิงก์เช็คชื่อรายชั้นและปิดหรือเปิดใช้งานได้ทันที"
        actions={
          <div className="flex gap-2">
            <RefreshButton onRefresh={() => tasksQuery.refetch()} />
            <NavButton icon={Plus} to="/create">
              สร้างลิงก์
            </NavButton>
          </div>
        }
      >
        <ToolbarControls>
          <SearchInput
            onChange={setSearch}
            placeholder="ค้นหาชั้น โรงเรียน หรือผู้รับผิดชอบ"
            value={search}
          />
          <FilterSelect
            ariaLabel="สถานะลิงก์เช็คชื่อ"
            className="sm:w-[220px]"
            onChange={setStatus}
            value={status}
          >
            {LINK_STATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>
        </ToolbarControls>
      </PageToolbar>

      <div className="space-y-5">
        <SummaryMetrics
          items={[
            { label: "ทั้งหมด", value: summary.total, tone: "default" },
            { label: "ใช้งานได้", value: summary.active, tone: "success" },
            { label: "ถูกล็อก", value: summary.locked, tone: "danger" },
            { label: "ไม่มีลิงก์", value: summary.expired, tone: "warning" },
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
          <DataTable
            headings={[
              "ชั้นเรียน",
              "โรงเรียน",
              "ผู้รับผิดชอบ",
              "สถานะ",
              "สร้างเมื่อ",
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
            responsive={false}
            footer={
              filteredTasks.length === 0 ? (
                <div className="border-t border-slate-100 py-12 text-center text-slate-500">
                  ไม่พบลิงก์เช็คชื่อตามตัวกรอง
                </div>
              ) : null
            }
          >
            {filteredTasks.map((task) => {
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
                      {task.active_link ? (
                        <Link
                          className="whitespace-nowrap text-sm font-semibold text-primary"
                          state={{ date: task.created_at?.split("T")[0] }}
                          to={`/attendance-links/${linkToken(task.active_link)}`}
                        >
                          ดูรายละเอียด
                        </Link>
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
        )}
      </div>
      {confirmDialog}
    </PageShell>
  );
}
