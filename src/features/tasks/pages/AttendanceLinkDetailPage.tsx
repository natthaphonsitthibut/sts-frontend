import { useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { Badge, Button, buttonVariants, Card } from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { CopyButton } from "../../../components/layout/copy-button";
import { taskService } from "../api/task.service";
import { formatDate, getAttendanceStatusLabel } from "../lib/task-presentation";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  มา: "success",
  สาย: "warning",
  ขาด: "destructive",
};

/**
 * Detail page for one attendance link — who was checked and their status.
 * Same layout as the case "รายละเอียดภารกิจ" page so every dashboard drills in
 * the same way (its own page, not a dialog).
 */
export function AttendanceLinkDetailPage() {
  const { token = "" } = useParams<{ token: string }>();
  const location = useLocation();
  const stateDate = (location.state as { date?: string } | null)?.date;
  const date = stateDate || new Date().toISOString().split("T")[0];

  const taskQuery = useQuery({
    queryKey: ["attendance-link-detail-task", token],
    queryFn: () => taskService.getTask(token),
    enabled: Boolean(token),
  });
  const historyQuery = useQuery({
    queryKey: ["attendance-link-detail-history", token, date],
    queryFn: () => taskService.getTaskHistory(token, date),
    enabled: Boolean(token),
  });

  if (taskQuery.isLoading) {
    return (
      <PageShell>
        <Card className="p-6">
          <SkeletonStack lines={5} />
        </Card>
      </PageShell>
    );
  }

  if (taskQuery.isError || !taskQuery.data) {
    return (
      <PageShell>
        <ErrorState
          title="ไม่สามารถโหลดรายละเอียดการเช็คชื่อได้"
          onRetry={() => void taskQuery.refetch()}
        />
      </PageShell>
    );
  }

  const task = taskQuery.data;
  const records = historyQuery.data ?? [];
  const publicLink = `${window.location.origin}/task/${token}`;

  return (
    <PageShell>
      <PageToolbar
        icon={ClipboardCheck}
        title="รายละเอียดการเช็คชื่อ"
        description={`${task.school_name ?? "-"} · ${task.target_grade ?? "-"}/${task.target_room ?? "-"}`}
        actions={
          <Button icon={ArrowLeft} onClick={() => window.history.back()} variant="outline">
            ย้อนกลับ
          </Button>
        }
      />
      <div className="space-y-5">
        <Card className="rounded-lg p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">ข้อมูลการเช็คชื่อ</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm text-slate-500">โรงเรียน</div>
              <div className="font-bold">{task.school_name || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">ชั้น / ห้อง</div>
              <div className="font-bold">
                {task.target_grade || "-"} {task.target_room || ""}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-500">วิชา</div>
              <div className="font-bold">{task.subject || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">ผู้เช็ค</div>
              <div className="font-bold">{task.assigned_to_name || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">วันที่</div>
              <div className="font-bold">{formatDate(date)}</div>
            </div>
          </div>
        </Card>

        <Card className="rounded-lg p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">ลิงก์เช็คชื่อ</h2>
          <div className="break-all rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm">
            {publicLink}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton label="คัดลอก" size="md" value={publicLink} variant="outline" />
            <a
              className={buttonVariants({ variant: "outline" })}
              href={publicLink}
              rel="noreferrer"
              target="_blank"
            >
              เปิดลิงก์
            </a>
          </div>
        </Card>

        <Card className="rounded-lg p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            รายชื่อที่เช็คชื่อ ({records.length})
          </h2>
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
        </Card>
      </div>
    </PageShell>
  );
}
