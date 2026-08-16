import { CalendarDays, CircleAlert } from "lucide-react";
import { Card } from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { StudentProfileHeader } from "../components/StudentProfileHeader";
import { useStudent } from "../hooks/useStudent";
import { useStudentAttendanceSummary } from "../hooks/useStudentAttendanceSummary";

function AttendanceStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export function StudentSelfPage() {
  const user = useAuthSessionStore((state) => state.user);
  // student_uuid is the opaque identifier returned by the backend after the
  // B1.3 read-path swap. Fall back to PersonID_Onec for sessions persisted
  // before the migration so existing logins don't silently break.
  const studentId = user?.student_uuid ?? user?.PersonID_Onec;
  const { student, isLoading, isError, refetch } = useStudent(studentId);
  const {
    summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useStudentAttendanceSummary(studentId);

  if (isLoading) {
    return (
      <PageShell>
        <Card className="mb-5 p-6">
          <SkeletonStack lines={3} />
        </Card>
        <Card className="p-6">
          <SkeletonStack lines={3} />
        </Card>
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell>
        <ErrorState
          title="โหลดข้อมูลนักเรียนไม่สำเร็จ"
          description="เกิดข้อผิดพลาดระหว่างโหลดข้อมูลของบัญชีนี้ กรุณาลองใหม่อีกครั้ง"
          onRetry={refetch}
        />
      </PageShell>
    );
  }

  if (!student || !studentId) {
    return (
      <PageShell>
        <EmptyState
          icon={CircleAlert}
          title="ไม่พบข้อมูลนักเรียน"
          description="บัญชีนี้ยังไม่มีรหัสนักเรียนที่เชื่อมกับข้อมูลในระบบ"
        />
      </PageShell>
    );
  }

  const stats = summary?.stats;

  return (
    <PageShell>
      <PageToolbar title="ข้อมูลตัวเอง" />
      <div className="space-y-5">
        <StudentProfileHeader
          canEditPhoto
          key={studentId}
          student={student}
          studentId={studentId}
          piiRevealMode="direct"
        />

        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900">สรุปการเข้าเรียน</h2>
          {summaryLoading ? (
            <SkeletonStack lines={2} className="mt-4" />
          ) : summaryError ? (
            <ErrorState
              className="mt-4"
              title="โหลดสรุปการเข้าเรียนไม่สำเร็จ"
              onRetry={refetchSummary}
            />
          ) : !stats || stats.total === 0 ? (
            <EmptyState
              className="mt-4 rounded-none border-none py-8 shadow-none"
              description="ข้อมูลการเข้าเรียนจะแสดงที่นี่หลังมีการเช็กชื่อครั้งแรก"
              icon={CalendarDays}
              title="ยังไม่มีข้อมูลการเข้าเรียน"
            />
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <AttendanceStat label="ทั้งหมด" value={stats.total} />
              <AttendanceStat label="เข้าเรียน" value={stats.present} />
              <AttendanceStat label="สาย" value={stats.late} />
              <AttendanceStat label="ขาด" value={stats.absent} />
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
