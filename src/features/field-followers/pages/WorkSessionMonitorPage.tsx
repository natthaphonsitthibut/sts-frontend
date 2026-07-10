import { useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { Badge, Combobox, Tabs } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import {
  EmptyState,
  ErrorState,
  ListPageToolbar,
  PageShell,
  SkeletonTable,
} from "../../../components/layout/page-primitives";
import { formatThaiDateTime } from "../../../lib/date-time";
import { SchoolAreaSchoolFilter } from "../../attendance/components/SchoolAreaSchoolFilter";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
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

function matchesSearch(term: string, ...names: Array<string | null | undefined>): boolean {
  if (!term) return true;
  return names.some((name) => name?.toLowerCase().includes(term));
}

export function WorkSessionMonitorPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"active" | "history">("active");
  const area = useSchoolAreaFilter();
  const scope = useScopeCascade({ lockToActorScope: true });
  const query = useWorkSessionMonitor({
    schoolId: scope.schoolId || undefined,
    province: area.province || undefined,
    district: area.district || undefined,
    subDistrict: area.subDistrict || undefined,
    grade: scope.grade || undefined,
    room: scope.room || undefined,
  });
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const active = useMemo(
    () =>
      (query.data?.active ?? []).filter((session) =>
        matchesSearch(normalizedSearch, session.assigned_to_name, session.student_name),
      ),
    [query.data, normalizedSearch],
  );
  const recentlyEnded = useMemo(
    () =>
      (query.data?.recentlyEnded ?? []).filter((session) =>
        matchesSearch(normalizedSearch, session.assigned_to_name, session.student_name),
      ),
    [query.data, normalizedSearch],
  );

  return (
    <PageShell>
      <ListPageToolbar
        actions={
          <Tabs
            aria-label="มุมมองช่วงปฏิบัติงาน"
            onChange={(next) => setView(next as "active" | "history")}
            options={[
              { value: "active", label: "กำลังปฏิบัติงาน" },
              { value: "history", label: "ประวัติ" },
            ]}
            value={view}
          />
        }
        description="ดูช่วงปฏิบัติงานภาคสนามที่กำลังทำงานอยู่ พร้อมตำแหน่งล่าสุด — อัปเดตอัตโนมัติทุก 20 วินาที"
        filters={
          <>
            <SchoolAreaSchoolFilter
              area={area}
              onSchoolChange={scope.setSchoolId}
              schoolId={scope.schoolId}
              schoolLocked={scope.schoolLocked}
            />
            <Combobox
              disabled={!scope.schoolId || scope.gradeLocked}
              onChange={scope.setGrade}
              options={[
                { value: "", label: "ทุกชั้น" },
                ...scope.gradeLevels.map((grade) => ({ value: grade.label, label: grade.label })),
              ]}
              placeholder="ค้นหาชั้น"
              value={scope.grade}
            />
            <Combobox
              disabled={!scope.grade || scope.roomLocked}
              onChange={scope.setRoom}
              options={[
                { value: "", label: "ทุกห้อง" },
                ...scope.rooms.map((room) => ({ value: room, label: `ห้อง ${room}` })),
              ]}
              placeholder="ค้นหาห้อง"
              value={scope.room}
            />
          </>
        }
        icon={Activity}
        search={{
          onChange: setSearchQuery,
          placeholder: "ค้นหาชื่อผู้ปฏิบัติงานหรือนักเรียน",
          value: searchQuery,
        }}
        title="ติดตามช่วงปฏิบัติงานภาคสนาม"
      />

      {query.isError ? (
        <ErrorState
          description="เกิดข้อผิดพลาดระหว่างโหลดข้อมูลช่วงปฏิบัติงาน"
          onRetry={query.refetch}
          title="โหลดข้อมูลช่วงปฏิบัติงานไม่สำเร็จ"
        />
      ) : null}

      {query.isLoading ? <SkeletonTable /> : null}

      {!query.isLoading && !query.isError && view === "active" ? (
        <div className="space-y-6">
          <section className="space-y-3">
            {active.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="ไม่มีใครกำลังปฏิบัติงานอยู่ตอนนี้"
                description={
                  searchQuery
                    ? "ลองค้นหาด้วยชื่ออื่น"
                    : "รอผู้ปฏิบัติงานเริ่มช่วงปฏิบัติงานภาคสนาม"
                }
              />
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
        </div>
      ) : null}

      {!query.isLoading && !query.isError && view === "history" ? (
        <section className="space-y-3">
          {recentlyEnded.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="ยังไม่มีประวัติช่วงปฏิบัติงานที่จบแล้ว"
              description={searchQuery ? "ลองค้นหาด้วยชื่ออื่น" : undefined}
            />
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
      ) : null}
    </PageShell>
  );
}
