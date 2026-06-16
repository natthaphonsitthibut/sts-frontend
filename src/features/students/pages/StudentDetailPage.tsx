import { useMemo, useState } from "react";
import { CircleAlert } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Card } from "../../../components/base";
import {
  EmptyState,
  PageShell,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { StudentProfileHeader } from "../components/StudentProfileHeader";
import { useStudent } from "../hooks/useStudent";
import { useStudentAttendanceSummary } from "../hooks/useStudentAttendanceSummary";
import { useStudentCases } from "../hooks/useStudentCases";
import type { StudentCase, StudentDetail } from "../types/students.types";

function formatThaiDate(dateString: string): string {
  if (!dateString) {
    return "-";
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function resolveFullName(student: StudentDetail | undefined): string {
  if (!student) {
    return "";
  }
  return `${student.FirstName_Onec ?? ""} ${student.LastName_Onec ?? ""}`.trim();
}

function CaseStatusBadge({ status }: { status: string }) {
  const isOpen = status === "OPEN";
  return (
    <Badge variant={isOpen ? "destructive" : "success"}>
      {isOpen ? "กำลังดำเนินการ" : "เสร็จสิ้น"}
    </Badge>
  );
}

function RiskHistoryPanel({
  cases,
  isLoading,
}: {
  cases: StudentCase[];
  isLoading: boolean;
}) {
  const [showAll, setShowAll] = useState(false);

  const sortedCases = useMemo(
    () =>
      [...cases].sort((left, right) => {
        if (left.status === "OPEN" && right.status !== "OPEN") return -1;
        if (left.status !== "OPEN" && right.status === "OPEN") return 1;
        return (
          new Date(right.created_at).getTime() -
          new Date(left.created_at).getTime()
        );
      }),
    [cases],
  );

  const visibleCases = showAll ? sortedCases : sortedCases.slice(0, 3);

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-800">
        ประวัติการติดตามนักเรียน
      </h2>

      {isLoading ? (
        <SkeletonStack lines={3} className="py-2" />
      ) : sortedCases.length === 0 ? (
        <div className="py-6 text-center text-slate-500">
          ไม่มีประวัติการติดตาม
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {visibleCases.map((studentCase) => (
              <li
                key={studentCase.id}
                className="flex items-start justify-between gap-4 py-4"
              >
                <div className="min-w-0">
                  <div className="text-xs text-slate-400">
                    {formatThaiDate(studentCase.created_at)}
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-700">
                    {studentCase.reason_flagged}
                  </div>
                </div>
                <CaseStatusBadge status={studentCase.status} />
              </li>
            ))}
          </ul>
          {sortedCases.length > 3 ? (
            <div className="mt-2 text-right">
              <Button
                className="font-medium text-slate-600 underline"
                onClick={() => setShowAll((current) => !current)}
                size="sm"
                variant="ghost"
              >
                {showAll ? "แสดงน้อยลง" : "เพิ่มเติม"}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}

function AttendanceStat({
  label,
  value,
  dotClass,
}: {
  label: string;
  value: number;
  dotClass: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 text-center">
      <div className="mb-1 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500">
        <span
          className={`size-2 rounded-full ${dotClass}`}
          aria-hidden="true"
        />
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
    </div>
  );
}

function AttendancePanel({ studentId }: { studentId: string }) {
  const { summary, isLoading } = useStudentAttendanceSummary(studentId);
  const stats = summary?.stats;

  return (
    <Card className="h-full p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-800">
        ประวัติการเข้าเรียน
      </h2>

      {isLoading ? (
        <SkeletonStack lines={3} className="py-2" />
      ) : !stats || stats.total === 0 ? (
        <div className="py-6 text-center text-slate-500">
          ไม่มีข้อมูลการเข้าเรียน
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <AttendanceStat
              dotClass="bg-success"
              label="เข้าเรียน"
              value={stats.present}
            />
            <AttendanceStat
              dotClass="bg-warning"
              label="มาเรียนสาย"
              value={stats.late}
            />
            <AttendanceStat
              dotClass="bg-danger"
              label="ไม่เข้าเรียน"
              value={stats.absent}
            />
          </div>
          <p className="mt-4 text-center text-sm text-slate-500">
            จากทั้งหมด {stats.total} วันที่บันทึก
          </p>
        </>
      )}
    </Card>
  );
}

export function StudentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const studentId = id?.trim();

  const { student, isLoading, isError } = useStudent(studentId);
  const fullName = resolveFullName(student);
  const { cases, isLoading: casesLoading } = useStudentCases(
    fullName || undefined,
  );

  if (isLoading) {
    return (
      <PageShell maxWidthClassName="max-w-[1000px]">
        <Card className="mb-6 p-6">
          <SkeletonStack lines={3} />
        </Card>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="p-6">
            <SkeletonStack lines={4} />
          </Card>
          <Card className="p-6">
            <SkeletonStack lines={4} />
          </Card>
        </div>
      </PageShell>
    );
  }

  if (!studentId || isError || !student) {
    return (
      <PageShell maxWidthClassName="max-w-[1000px]">
        <EmptyState
          icon={CircleAlert}
          title="ไม่พบข้อมูลนักเรียน"
          description="ไม่พบข้อมูลนักเรียนระเบียนหรือรหัสนี้ในระบบ"
          action={
            <Button onClick={() => void navigate(-1)} variant="outline">
              ย้อนกลับ
            </Button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell maxWidthClassName="max-w-[1000px]">
      <StudentProfileHeader
        key={studentId}
        student={student}
        studentId={studentId}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <RiskHistoryPanel cases={cases} isLoading={casesLoading} />
        {studentId ? <AttendancePanel studentId={studentId} /> : null}
      </div>
    </PageShell>
  );
}
