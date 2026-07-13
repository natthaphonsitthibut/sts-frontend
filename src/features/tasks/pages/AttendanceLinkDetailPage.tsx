import { useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, ClipboardCheck } from "lucide-react";
import { Badge, Card } from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { LinkShareActions } from "../../../components/layout/link-share-actions";
import { LinkStatusBadge } from "../../../components/layout/link-status-badge";
import { LinkLockToggleButton } from "../../../components/layout/link-lock-toggle-button";
import { LinkTimeSummary } from "../../../components/layout/link-time-summary";
import { NavButton } from "../../../components/layout/nav-button";
import { getTodayIso } from "../../attendance/lib/attendance-presentation";
import { AuditLogPanel } from "../../audit-log/components/AuditLogPanel";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { loginLinksService } from "../../login-links/api/login-links.service";
import {
  formatDate,
  getAttendanceStatusItem,
  toAbsoluteUrl,
} from "../lib/task-presentation";
import {
  findStatusCatalogItem,
  useStatusCatalog,
} from "../../status-catalog/hooks/useStatusCatalog";

export const ATTENDANCE_LINK_DETAIL_KEY = "attendance-link-detail";
const ATTENDANCE_TASKS_KEY = "attendance-link-tasks";

const ATTENDANCE_LINK_DETAIL_AUDIT_ACTION_OPTIONS = [
  { value: "LINK_LOCK", label: "ปิดลิงก์" },
  { value: "LINK_UNLOCK", label: "เปิดลิงก์อีกครั้ง" },
] as const;

/**
 * Detail page for one attendance link — who was checked and their status.
 * Loads admin-side by link id so it renders even when the link is closed or
 * expired, and lets the admin open/close it from here.
 */
export function AttendanceLinkDetailPage() {
  const { can } = usePermissions();
  const linkStateCatalog = useStatusCatalog("TASK_LINK_STATE").items;
  const attendanceStatusCatalog = useStatusCatalog("ATTENDANCE_RECORD").items;
  const { linkId = "" } = useParams<{ linkId: string }>();
  const location = useLocation();
  const stateDate = (location.state as { date?: string } | null)?.date;
  const date = stateDate || getTodayIso();

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
  const statusMeta = findStatusCatalogItem(linkStateCatalog, detail.status);
  const canToggleLink = detail.status !== "EXPIRED";
  const canViewAuditLog = can("audit-log");

  return (
    <PageShell>
      <PageToolbar
        icon={ClipboardCheck}
        title="รายละเอียดการเช็คชื่อ"
        description={`${detail.school_name ?? "-"} · ${detail.target_grade ?? "-"}/${detail.target_room ?? "-"}`}
        actions={
          <div className="flex flex-nowrap items-center gap-3">
            {canToggleLink ? (
              <LinkLockToggleButton
                linkId={detail.link_id}
                locked={detail.admin_locked}
                invalidateKeys={[[ATTENDANCE_LINK_DETAIL_KEY], [ATTENDANCE_TASKS_KEY]]}
              />
            ) : null}
            <NavButton icon={ArrowLeft} to={-1} variant="outline">
              ย้อนกลับ
            </NavButton>
          </div>
        }
      />
      <div className="space-y-5">
        <Card className="rounded-lg p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">ข้อมูลการเช็คชื่อ</h2>
            <LinkStatusBadge
              label={statusMeta?.label ?? detail.status}
              variant={statusMeta?.badgeVariant ?? "secondary"}
            />
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

        {canViewAuditLog ? (
          <Card className="rounded-lg p-6">
            <AuditLogPanel
              actionOptions={ATTENDANCE_LINK_DETAIL_AUDIT_ACTION_OPTIONS}
              description="ดูประวัติการปิดและเปิดลิงก์เช็คชื่อนี้ย้อนหลัง"
              domain="tasks"
              showReferenceColumn={false}
              targetId={linkId}
              targetType="task_link"
              taskType="ATTENDANCE"
              title="ประวัติลิงก์นี้"
            />
          </Card>
        ) : null}

        <Card className="rounded-lg p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            รายชื่อที่เช็คชื่อ ({records.length})
          </h2>
          {records.length === 0 ? (
            <EmptyState
              className="border-none py-6 shadow-none"
              description="ประวัติการเช็คชื่อจะแสดงที่นี่หลังมีการใช้ลิงก์นี้"
              icon={CalendarDays}
              title="ยังไม่มีการเช็คชื่อสำหรับลิงก์นี้"
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {records.map((record) => {
                const status = getAttendanceStatusItem(
                  String(record.status),
                  attendanceStatusCatalog,
                );
                const isSubjectRecord = record.session_kind === "SUBJECT";
                return (
                  <li
                    className="flex items-center justify-between gap-3 py-2.5"
                    key={`${record.student_id}-${record.timetable_slot_id ?? record.period ?? "daily"}`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">
                        {record.student_name}
                      </div>
                      {isSubjectRecord ? (
                        <div className="mt-1 text-xs text-slate-500">
                          รายวิชา: {record.subject_name_th || detail.subject || "-"}
                          {record.subject_code ? ` (${record.subject_code})` : ""} · คาบ{" "}
                          {record.period || "-"}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isSubjectRecord ? <Badge variant="secondary">รายวิชา</Badge> : null}
                      <Badge variant={status?.badgeVariant ?? "secondary"}>
                        {status?.shortLabel ?? status?.label ?? String(record.status)}
                      </Badge>
                    </div>
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
