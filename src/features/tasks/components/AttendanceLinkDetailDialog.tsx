import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/base";
import { SkeletonStack } from "../../../components/layout/page-primitives";
import { taskService } from "../api/task.service";
import { formatDate, getAttendanceStatusLabel } from "../lib/task-presentation";
import type { AttendanceTask } from "../../attendance/types/attendance.types";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  มา: "success",
  สาย: "warning",
  ขาด: "destructive",
};

/** The raw token lives at the end of the shared link path (".../task/<token>"). */
function extractToken(activeLink: string | null): string {
  if (!activeLink) {
    return "";
  }
  return activeLink.split("/").filter(Boolean).pop() ?? "";
}

interface AttendanceLinkDetailDialogProps {
  task: AttendanceTask | null;
  onClose: () => void;
}

/**
 * Read-only detail for an attendance link: who was checked and their status on
 * the link's date. Mirrors the "ดูรายละเอียด" affordance the case dashboard
 * already has, so every dashboard can drill into its rows.
 */
export function AttendanceLinkDetailDialog({
  task,
  onClose,
}: AttendanceLinkDetailDialogProps) {
  const token = extractToken(task?.active_link ?? null);
  const date = task?.created_at ? task.created_at.split("T")[0] : "";

  const historyQuery = useQuery({
    queryKey: ["attendance-link-history", token, date],
    queryFn: () => taskService.getTaskHistory(token, date),
    enabled: Boolean(task && token),
  });
  const records = historyQuery.data ?? [];

  return (
    <Dialog onOpenChange={(next) => (next ? undefined : onClose())} open={Boolean(task)}>
      <DialogContent className="w-[min(92vw,520px)]" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>รายละเอียดการเช็คชื่อ</DialogTitle>
          <DialogDescription>
            {task
              ? `${task.target_school_name ?? "-"} · ${task.target_grade}/${task.target_room} · ${formatDate(task.created_at)}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {task?.link_assigned_to ? (
          <p className="mt-2 text-sm text-slate-600">เช็คโดย: {task.link_assigned_to}</p>
        ) : null}

        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {historyQuery.isLoading ? (
            <SkeletonStack lines={4} />
          ) : records.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              ยังไม่มีการเช็คชื่อสำหรับลิงก์นี้
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {records.map((record) => {
                const label = getAttendanceStatusLabel(String(record.status));
                return (
                  <li
                    className="flex items-center justify-between gap-3 py-2.5"
                    key={record.student_id}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">
                        {record.student_name}
                      </div>
                      <div className="truncate text-xs text-slate-500">{record.student_id}</div>
                    </div>
                    <Badge variant={STATUS_VARIANT[label] ?? "secondary"}>{label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
