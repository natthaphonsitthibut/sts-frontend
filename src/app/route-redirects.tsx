import { Navigate, useLocation, useParams } from "react-router-dom";
import { usePermissions } from "../features/auth/hooks/usePermissions";

function suffixWithoutLegacyTab(search: string, hash: string): string {
  const query = new URLSearchParams(search);
  query.delete("tab");
  const serialized = query.toString();
  return `${serialized ? `?${serialized}` : ""}${hash}`;
}

export function LegacyRouteRedirect({ to }: { to: string }) {
  const location = useLocation();

  return <Navigate replace to={`${to}${location.search}${location.hash}`} />;
}

/** Preserve the old attendance entry URL while each workspace view has its own path. */
export function AttendanceDefaultRedirect() {
  const location = useLocation();
  return (
    <Navigate
      replace
      to={`/attendance/roster${location.search}${location.hash}`}
    />
  );
}

export function LegacyCasesRedirect() {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const legacyStatus = query.get("status");
  if (legacyStatus && !query.has("caseStatus")) {
    query.set("caseStatus", legacyStatus);
  }
  query.delete("status");

  const isWatchlist = location.pathname.endsWith("/watchlist");
  if (location.pathname.endsWith("/history") && !query.has("caseStatus")) {
    query.set("caseStatus", "RESOLVED");
  }
  const serialized = query.toString();
  return (
    <Navigate
      replace
      to={`${isWatchlist ? "/student-risk-report/watchlist" : "/student-risk-report/risk"}${serialized ? `?${serialized}` : ""}${location.hash}`}
    />
  );
}

export function LegacyTaskDetailRedirect() {
  const location = useLocation();
  const { taskId } = useParams<{ taskId: string }>();

  return (
    <Navigate
      replace
      to={
        taskId
          ? `/tasks/${encodeURIComponent(taskId)}${location.search}${location.hash}`
          : "/"
      }
    />
  );
}

/** `/attendance/history` opens on the check-in rounds, like the teacher link. */
export function AttendanceHistoryDefaultRedirect() {
  const location = useLocation();
  return (
    <Navigate
      replace
      to={`/attendance/history/attendance${location.search}${location.hash}`}
    />
  );
}

export function TeacherClassroomDefaultRedirect() {
  const location = useLocation();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const legacyTab = new URLSearchParams(location.search).get("tab");
  const isCheckIn =
    legacyTab === "attendance" || location.pathname.endsWith("/attendance");
  const tab = isCheckIn ? "check-in" : "roster";
  return (
    <Navigate
      replace
      to={`/teacher-access/classes/${encodeURIComponent(assignmentId ?? "")}/${tab}${suffixWithoutLegacyTab(location.search, location.hash)}`}
    />
  );
}

export function TeacherHistoryDefaultRedirect() {
  const location = useLocation();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  return (
    <Navigate
      replace
      to={`/teacher-access/classes/${encodeURIComponent(assignmentId ?? "")}/history/attendance${location.search}${location.hash}`}
    />
  );
}

export function ClassroomDefaultRedirect() {
  const location = useLocation();
  const { classroomId } = useParams<{ classroomId: string }>();
  return (
    <Navigate
      replace
      to={`/classrooms/${encodeURIComponent(classroomId ?? "")}/roster${location.search}${location.hash}`}
    />
  );
}

export function TimetableDefaultRedirect() {
  const location = useLocation();
  const { can } = usePermissions();
  const tab = can("timetable") ? "rooms" : "mine";
  return (
    <Navigate
      replace
      to={`/timetable/${tab}${location.search}${location.hash}`}
    />
  );
}
