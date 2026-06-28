import { useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { Badge, Button, Card } from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { LinkShareActions } from "../../../components/layout/link-share-actions";
import { LinkStatusBadge } from "../../../components/layout/link-status-badge";
import { LinkLockToggleButton } from "../../../components/layout/link-lock-toggle-button";
import { LinkTimeSummary } from "../../../components/layout/link-time-summary";
import { loginLinksService } from "../../login-links/api/login-links.service";
import type { AdminLinkDetail } from "../../login-links/types/login-links.types";
import {
  formatDate,
  getAttendanceStatusLabel,
  toAbsoluteUrl,
} from "../lib/task-presentation";

export const ATTENDANCE_LINK_DETAIL_KEY = "attendance-link-detail";
const ATTENDANCE_TASKS_KEY = "attendance-link-tasks";

const RECORD_STATUS_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  มา: "success",
  สาย: "warning",
  ขาด: "destructive",
};

const LINK_STATUS: Record<
  AdminLinkDetail["status"],
  { label: string; variant: "success" | "destructive" | "secondary" }
> = {
  ACTIVE: { label: "ใช้งานได้", variant: "success" },
  LOCKED: { label: "ถูกปิด", variant: "destructive" },
  EXPIRED: { label: "หมดอายุ", variant: "secondary" },
};

/**
 * Detail page for one attendance link — who was checked and their status.
 * Loads admin-side by link id so it renders even when the link is closed or
 * expired, and lets the admin open/close it from here.
 */
export function AttendanceLinkDetailPage() {
  const { linkId = "" } = useParams<{ linkId: string }>();
  const location = useLocation();
  const stateDate = (location.state as { date?: string } | null)?.date;
  const date = stateDate || new Date().toISOString().split("T")[0];

  const detailQuery = useQuery({
    queryKey: [ATTENDANCE_LINK_DETAIL_KEY, linkId, date],
    queryFn: () => loginLinksService.getAdminLinkDetail(linkId, date),
    enabled: Boolean(linkId),
  });

  if (detailQuery.isLoading) {
    return (
      <PageShell>
        <Card className="p-6">
          <SkeletonStack lines={5} />
        </Card>
      </PageShell>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <PageShell>
        <ErrorState
          title="ไม่สามารถโหลดรายละเอียดการเช็คชื่อได้"
          onRetry={() => void detailQuery.refetch()}
        />
      </PageShell>
    );
  }

  const detail = detailQuery.data;
  const records = detail.records ?? [];
  const publicLink = toAbsoluteUrl(detail.magic_link ?? "");
  const statusMeta = LINK_STATUS[detail.status];

  return (
    <PageShell>
      <PageToolbar
        icon={ClipboardCheck}
        title="รายละเอียดการเช็คชื่อ"
        description={`${detail.school_name ?? "-"} · ${detail.target_grade ?? "-"}/${detail.target_room ?? "-"}`}
        actions={
          <div className="flex flex-nowrap items-center gap-3">
            <LinkLockToggleButton
              linkId={detail.link_id}
              locked={detail.admin_locked}
              invalidateKeys={[[ATTENDANCE_LINK_DETAIL_KEY], [ATTENDANCE_TASKS_KEY]]}
            />
            <Button icon={ArrowLeft} onClick={() => window.history.back()} variant="outline">
              ย้อนกลับ
            </Button>
          </div>
        }
      />
      <div className="space-y-5">
        <Card className="rounded-lg p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">ข้อมูลการเช็คชื่อ</h2>
            <LinkStatusBadge label={statusMeta.label} variant={statusMeta.variant} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm text-slate-500">โรงเรียน</div>
              <div className="font-bold">{detail.school_name || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">ชั้น / ห้อง</div>
              <div className="font-bold">
                {detail.target_grade || "-"} {detail.target_room || ""}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-500">วิชา</div>
              <div className="font-bold">{detail.subject || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">ผู้เช็ค</div>
              <div className="font-bold">{detail.assigned_to_name || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">วันที่</div>
              <div className="font-bold">{formatDate(date)}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-sm text-slate-500">ช่วงเวลา</div>
              <LinkTimeSummary
                className="mt-1 max-w-sm"
                expiresAt={detail.expires_at}
                startsAt={detail.created_at}
              />
            </div>
          </div>
        </Card>

        <Card className="rounded-lg p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">ลิงก์เช็คชื่อ</h2>
          <LinkShareActions link={publicLink} />
        </Card>

        <Card className="rounded-lg p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            รายชื่อที่เช็คชื่อ ({records.length})
          </h2>
          {records.length === 0 ? (
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
                    </div>
                    <Badge variant={RECORD_STATUS_VARIANT[label] ?? "secondary"}>{label}</Badge>
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
