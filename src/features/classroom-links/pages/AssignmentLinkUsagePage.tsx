import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, ScrollText } from "lucide-react";
import { useLocation, useParams } from "react-router-dom";
import { Badge, Card } from "../../../components/base";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";
import { NavButton } from "../../../components/layout/nav-button";
import { getNavigationContext } from "../../../components/layout/navigation-context";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import {
  formatThaiDateTime,
  normalizeCalendarDateKey,
} from "../../../lib/date-time";
import { checkInService } from "../../check-in/api/check-in.service";
import type { CheckInAccess } from "../../check-in/types/check-in.types";
import { useMyAssignmentUsage } from "../hooks/useClassroomLinks";
import type { ClassroomLinkSession } from "../types/classroom-links.types";

/**
 * Everything one assignment link did, on a page of its own.
 *
 * A dialog was the wrong container: a link left open for a fortnight collects
 * a long list of openings and a register for every lesson taken through it, and
 * that does not belong in a box that has to be dismissed before the teacher can
 * look at anything else. A page can be scrolled, kept open, and linked to.
 *
 * The same component serves both doors — the staff screen inside the app shell,
 * a teacher's own link inside the guest shell — because what it shows is the
 * same record either way.
 */
export function AssignmentLinkUsagePage({ access }: { access: CheckInAccess }) {
  const { linkId } = useParams<{ linkId: string }>();
  const location = useLocation();
  const internal = access === "INTERNAL";
  // Back to the tab that opened this, not to a fixed page: whoever came from
  // the register should land on it with their filter as they left it.
  const backTo =
    getNavigationContext(location.state)?.backTo ??
    (internal ? "/attendance/check-in" : "/classroom");
  const usage = useMyAssignmentUsage(access, linkId ?? null);

  const context = useQuery({
    queryKey: ["check-in", "context"],
    queryFn: () => checkInService.getPublicContext(),
    enabled: !internal,
    retry: false,
  });
  const authentication = context.data?.authentication;
  const assignmentLabel = usage.data
    ? `${usage.data.assignment.classroomLabel} · ${usage.data.assignment.subjectName}`
    : "กำลังโหลดข้อมูลรายวิชา";

  function checkInTarget(session: ClassroomLinkSession): string {
    const attendanceDate = normalizeCalendarDateKey(session.attendanceDate);
    if (!internal) {
      const params = new URLSearchParams({ date: attendanceDate });
      return `/classroom/check-in/${session.classroomId}/${session.classroomSubjectId}?${params.toString()}`;
    }
    const params = new URLSearchParams({
      schoolId: String(session.schoolId),
      gradeId: String(session.gradeLevelId),
      classroomId: String(session.classroomId),
      classroomSubjectId: String(session.classroomSubjectId),
      date: attendanceDate,
    });
    return `/attendance/check-in?${params.toString()}`;
  }

  const header = (
    <PageToolbar
      // The staff check-in page is deliberately left out of navigation trails
      // (it is a tabbed page, not a step), so nothing upstream supplies a crumb
      // and the row would collapse. Name the parent outright; on the link side
      // use the exact classroom and subject returned for this assignment.
      breadcrumbTrail={
        internal ? undefined : [{ label: assignmentLabel, to: backTo }]
      }
      icon={ScrollText}
      parentBreadcrumb={
        internal ? { label: "เช็กชื่อ", to: backTo } : undefined
      }
      navigation={
        <NavButton
          className="min-w-28"
          icon={ArrowLeft}
          to={backTo}
          variant="outline"
        >
          ย้อนกลับ
        </NavButton>
      }
      title="การใช้งานลิงก์มอบหมาย"
    />
  );

  const body = usage.isLoading ? (
    <Card className="p-6">
      <SkeletonStack lines={6} />
    </Card>
  ) : usage.isError ? (
    <ErrorState
      description="ลิงก์นี้อาจถูกลบ หรือไม่ใช่ลิงก์ที่คุณสร้างไว้"
      onRetry={() => void usage.refetch()}
      title="โหลดการใช้งานลิงก์ไม่สำเร็จ"
    />
  ) : (
    <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
      <Card className="flex h-[min(70dvh,42rem)] min-h-[28rem] flex-col p-5">
        <h2 className="mb-1 text-lg font-bold text-slate-800">
          ผู้เข้าใช้ลิงก์
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          ทุกครั้งที่มีคนเปิดลิงก์นี้ เรียงจากครั้งล่าสุด
        </p>
        <div
          aria-label="รายการผู้เข้าใช้ลิงก์"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          role="region"
          tabIndex={0}
        >
          {usage.data?.opens.length ? (
            <ul className="space-y-2">
              {usage.data.opens.map((open) => (
                <li
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
                  key={`${open.openedAt}-${open.teacherName}`}
                >
                  <span className="font-medium text-slate-800">
                    {open.teacherName}
                  </span>
                  <span className="text-sm text-slate-500">
                    {formatThaiDateTime(open.openedAt)}
                    {open.authMethod ? ` · ${open.authMethod}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              description="ลิงก์ถูกสร้างแล้วแต่ยังไม่มีใครกดเข้ามา"
              icon={ScrollText}
              title="ยังไม่มีใครเปิดลิงก์นี้"
            />
          )}
        </div>
      </Card>

      <Card className="flex h-[min(70dvh,42rem)] min-h-[28rem] flex-col p-5">
        <h2 className="mb-1 text-lg font-bold text-slate-800">
          การเช็กชื่อผ่านลิงก์นี้
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          แต่ละคาบที่เช็กผ่านลิงก์ ตั้งแต่เริ่มจนส่งผล
        </p>
        <div
          aria-label="รายการการเช็กชื่อผ่านลิงก์"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          role="region"
          tabIndex={0}
        >
          {usage.data?.sessions.length ? (
            <ul className="space-y-2">
              {usage.data.sessions.map((session) => (
                <li
                  className="space-y-1 rounded-lg border border-slate-200 px-3 py-2"
                  key={session.id}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-slate-800">
                      {session.classroomLabel} · {session.subjectName}
                    </span>
                    <Badge
                      variant={session.submittedAt ? "success" : "warning"}
                    >
                      {session.submittedAt ? "ส่งผลแล้ว" : "ยังไม่ส่งผล"}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">
                    เริ่ม {formatThaiDateTime(session.startedAt)}
                    {session.startedByName
                      ? ` โดย ${session.startedByName}`
                      : ""}
                  </p>
                  {session.submittedAt ? (
                    <p className="text-sm text-slate-500">
                      ส่งผล {formatThaiDateTime(session.submittedAt)}
                      {session.submittedByName
                        ? ` โดย ${session.submittedByName}`
                        : ""}
                    </p>
                  ) : null}
                  <div className="flex justify-end pt-1">
                    <NavButton
                      icon={Eye}
                      size="sm"
                      to={checkInTarget(session)}
                      variant="outline"
                    >
                      ดูการเช็กชื่อ
                    </NavButton>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              description="ยังไม่มีใครเช็กชื่อผ่านลิงก์นี้"
              icon={ScrollText}
              title="ยังไม่มีการเช็กชื่อ"
            />
          )}
        </div>
      </Card>
    </div>
  );

  if (internal) {
    return (
      <PageShell>
        {header}
        {body}
      </PageShell>
    );
  }
  return (
    <GuestPageShell
      as="main"
      profileAffiliation={context.data?.school.name ?? null}
      profileName={
        authentication?.status === "AUTHENTICATED"
          ? authentication.displayName
          : undefined
      }
      profilePhotoUrl={
        authentication?.status === "AUTHENTICATED"
          ? authentication.photoUrl
          : null
      }
    >
      {header}
      {body}
    </GuestPageShell>
  );
}
