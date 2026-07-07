import { Activity } from "lucide-react";
import { Alert, AlertDescription, Badge } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { PageShell, PageToolbar } from "../../../components/layout/page-primitives";
import { formatThaiDateTime } from "../../../lib/date-time";
import { getApiErrorMessage } from "../../../lib/api-error";
import { useWorkSessionMonitor } from "../hooks/useWorkSessionMonitor";
import type {
  ActiveWorkSession,
  RecentlyEndedWorkSession,
  WorkSessionEndReason,
} from "../types/work-session-monitor.types";

const END_REASON_LABELS: Record<WorkSessionEndReason, string> = {
  MANUAL: "จบเอง",
  SUBMITTED: "ส่งรายงานแล้ว",
  TIMEOUT: "หมดเวลาอัตโนมัติ",
};

function locationText(session: ActiveWorkSession): string {
  if (session.last_ping_lat === null || session.last_ping_lng === null) {
    return "ยังไม่มีตำแหน่ง";
  }
  return `${session.last_ping_lat.toFixed(5)}, ${session.last_ping_lng.toFixed(5)}`;
}

export function WorkSessionMonitorPage() {
  const query = useWorkSessionMonitor();
  const active = query.data?.active ?? [];
  const recentlyEnded = query.data?.recentlyEnded ?? [];

  return (
    <PageShell>
      <PageToolbar
        description="ดูช่วงปฏิบัติงานภาคสนามที่กำลังทำงานอยู่ พร้อมตำแหน่งล่าสุด — อัปเดตอัตโนมัติทุก 20 วินาที"
        icon={Activity}
        title="ติดตามช่วงปฏิบัติงานภาคสนาม"
      />

      {query.isError ? (
        <Alert className="mb-4" variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(query.error, "โหลดข้อมูลช่วงปฏิบัติงานไม่สำเร็จ")}
          </AlertDescription>
        </Alert>
      ) : null}

      {query.isLoading ? (
        <div className="py-10 text-center text-slate-500">กำลังโหลด...</div>
      ) : null}

      {!query.isLoading ? (
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900">
              กำลังปฏิบัติงาน ({active.length})
            </h3>
            {active.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white py-8 text-center text-slate-500 shadow-card">
                ไม่มีใครกำลังปฏิบัติงานอยู่ตอนนี้
              </div>
            ) : (
              <>
                <DataTable
                  headings={["ผู้ปฏิบัติงาน", "นักเรียน/โรงเรียน", "เริ่มเมื่อ", "ตำแหน่งล่าสุด", "อัปเดตล่าสุด"]}
                  minWidthClassName="min-w-full"
                  responsiveBreakpoint="lg"
                >
                  {active.map((session) => (
                    <DataTableRow key={session.session_id}>
                      <DataTableCell className="font-bold text-slate-900">
                        {session.assigned_to_name || "-"}
                      </DataTableCell>
                      <DataTableCell>
                        {session.student_name || "-"}
                        {session.school_name ? ` · ${session.school_name}` : ""}
                      </DataTableCell>
                      <DataTableCell>{formatThaiDateTime(session.started_at)}</DataTableCell>
                      <DataTableCell className="font-mono text-xs">
                        {locationText(session)}
                      </DataTableCell>
                      <DataTableCell>
                        {session.last_ping_at ? formatThaiDateTime(session.last_ping_at) : "-"}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTable>
                <TableCardList desktopBreakpoint="lg">
                  {active.map((session) => (
                    <TableCard className="space-y-2" key={session.session_id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-bold text-slate-900">
                          {session.assigned_to_name || "-"}
                        </div>
                        <Badge variant="success">กำลังปฏิบัติงาน</Badge>
                      </div>
                      <div className="text-sm text-slate-600">
                        {session.student_name || "-"}
                        {session.school_name ? ` · ${session.school_name}` : ""}
                      </div>
                      <div className="text-sm text-slate-500">
                        เริ่มเมื่อ {formatThaiDateTime(session.started_at)}
                      </div>
                      <div className="font-mono text-xs text-slate-500">
                        ตำแหน่งล่าสุด: {locationText(session)}
                        {session.last_ping_at
                          ? ` (${formatThaiDateTime(session.last_ping_at)})`
                          : ""}
                      </div>
                    </TableCard>
                  ))}
                </TableCardList>
              </>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900">ประวัติล่าสุด</h3>
            {recentlyEnded.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white py-8 text-center text-slate-500 shadow-card">
                ยังไม่มีประวัติช่วงปฏิบัติงานที่จบแล้ว
              </div>
            ) : (
              <>
                <DataTable
                  headings={["ผู้ปฏิบัติงาน", "นักเรียน", "เริ่ม", "จบ", "เหตุผลที่จบ"]}
                  minWidthClassName="min-w-full"
                  responsiveBreakpoint="lg"
                >
                  {recentlyEnded.map((session: RecentlyEndedWorkSession) => (
                    <DataTableRow key={session.session_id}>
                      <DataTableCell className="font-bold text-slate-900">
                        {session.assigned_to_name || "-"}
                      </DataTableCell>
                      <DataTableCell>{session.student_name || "-"}</DataTableCell>
                      <DataTableCell>{formatThaiDateTime(session.started_at)}</DataTableCell>
                      <DataTableCell>{formatThaiDateTime(session.ended_at)}</DataTableCell>
                      <DataTableCell>
                        <Badge variant="secondary">{END_REASON_LABELS[session.end_reason]}</Badge>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTable>
                <TableCardList desktopBreakpoint="lg">
                  {recentlyEnded.map((session: RecentlyEndedWorkSession) => (
                    <TableCard className="space-y-2" key={session.session_id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-bold text-slate-900">
                          {session.assigned_to_name || "-"}
                        </div>
                        <Badge variant="secondary">{END_REASON_LABELS[session.end_reason]}</Badge>
                      </div>
                      <div className="text-sm text-slate-600">{session.student_name || "-"}</div>
                      <div className="text-sm text-slate-500">
                        {formatThaiDateTime(session.started_at)} →{" "}
                        {formatThaiDateTime(session.ended_at)}
                      </div>
                    </TableCard>
                  ))}
                </TableCardList>
              </>
            )}
          </section>
        </div>
      ) : null}
    </PageShell>
  );
}
