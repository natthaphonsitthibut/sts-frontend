import { CircleAlert } from "lucide-react";
import { Card } from "../../../components/base";
import {
  EmptyState,
  PageShell,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { StudentProfileHeader } from "../components/StudentProfileHeader";
import { useStudent } from "../hooks/useStudent";
import { useStudentAttendanceSummary } from "../hooks/useStudentAttendanceSummary";

function AttendanceStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export function StudentSelfPage() {
  const user = useAuthSessionStore((state) => state.user);
  const studentId = user?.PersonID_Onec;
  const { student, isLoading, isError } = useStudent(studentId);
  const { summary, isLoading: summaryLoading } =
    useStudentAttendanceSummary(studentId);

  if (isLoading) {
    return (
      <PageShell maxWidthClassName="max-w-[980px]">
        <Card className="mb-5 p-6">
          <SkeletonStack lines={3} />
        </Card>
        <Card className="p-6">
          <SkeletonStack lines={3} />
        </Card>
      </PageShell>
    );
  }

  if (isError || !student || !studentId) {
    return (
      <PageShell maxWidthClassName="max-w-[980px]">
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
    <PageShell maxWidthClassName="max-w-[980px]">
      <div className="space-y-5">
        <StudentProfileHeader student={student} />

        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900">สรุปการเข้าเรียน</h2>
          {summaryLoading ? (
            <SkeletonStack lines={2} className="mt-4" />
          ) : !stats || stats.total === 0 ? (
            <div className="py-8 text-center text-slate-500">
              ยังไม่มีข้อมูลการเข้าเรียน
            </div>
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
