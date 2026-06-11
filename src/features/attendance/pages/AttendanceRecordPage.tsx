import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Save, TriangleAlert } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
} from "../../../components/base";
import {
  EmptyState,
  PageShell,
  SkeletonStack,
  SkeletonTable,
} from "../../../components/layout/page-primitives";
import { formatStudentRoom } from "../../students/lib/student-presentation";
import { AttendanceStudentTable } from "../components/AttendanceStudentTable";
import { useAttendanceClassRoster } from "../hooks/useAttendanceClassRoster";
import { useSubmitAttendance } from "../hooks/useSubmitAttendance";
import type { AttendanceSelectionStatus } from "../types/attendance.types";

export function AttendanceRecordPage() {
  const navigate = useNavigate();
  const { classId } = useParams<{ classId: string }>();

  const { task, students, isLoading, isError, notFound } =
    useAttendanceClassRoster(classId);
  const submitAttendance = useSubmitAttendance();

  const [selections, setSelections] = useState<
    Record<string, AttendanceSelectionStatus>
  >({});

  function handleStatusChange(
    studentId: string,
    status: AttendanceSelectionStatus,
  ): void {
    setSelections((current) => ({ ...current, [studentId]: status }));
  }

  const counts = useMemo(() => {
    return students.reduce(
      (acc, student) => {
        const status = selections[student.id] ?? "P_PRESENT";
        if (status === "P_PRESENT") acc.present += 1;
        else if (status === "P_ABSENT") acc.absent += 1;
        else if (status === "P_LATE") acc.late += 1;
        return acc;
      },
      { present: 0, absent: 0, late: 0 },
    );
  }, [students, selections]);

  function handleSave(): void {
    const records = students.map((student) => ({
      student_id: student.id,
      status: selections[student.id] ?? "P_PRESENT",
    }));
    submitAttendance.mutate(records);
  }

  if (isLoading) {
    return (
      <PageShell maxWidthClassName="max-w-[1000px]">
        <Card className="mb-6 p-6">
          <SkeletonStack lines={2} />
        </Card>
        <SkeletonTable rows={8} />
      </PageShell>
    );
  }

  if (isError || notFound || !task) {
    return (
      <PageShell maxWidthClassName="max-w-[1000px]">
        <EmptyState
          icon={TriangleAlert}
          title="ไม่พบชั้นเรียนนี้"
          description="ไม่พบข้อมูลชั้นเรียนสำหรับการเช็คชื่อ"
          action={
            <Button
              icon={ArrowLeft}
              onClick={() => void navigate("/attendance")}
              variant="outline"
            >
              กลับไปแดชบอร์ด
            </Button>
          }
        />
      </PageShell>
    );
  }

  const newCases = submitAttendance.data?.newCases ?? [];

  return (
    <PageShell maxWidthClassName="max-w-[1000px]" className="pb-28">
      <Card className="mb-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              aria-label="ย้อนกลับ"
              icon={ArrowLeft}
              onClick={() => void navigate("/attendance")}
              size="sm"
              variant="ghost"
            />
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                {task.target_grade || "-"} {formatStudentRoom(task.target_room)}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {task.target_school_name || "-"} · นักเรียน {students.length} คน
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Badge variant="success">มา {counts.present}</Badge>
            <Badge variant="warning">สาย {counts.late}</Badge>
            <Badge variant="destructive">ขาด {counts.absent}</Badge>
          </div>
        </div>
      </Card>

      <div className="mb-6 min-h-[96px]">
        {submitAttendance.isError ? (
          <Alert variant="destructive">
            <AlertTitle>บันทึกไม่สำเร็จ</AlertTitle>
            <AlertDescription>
              เกิดข้อผิดพลาดระหว่างบันทึกการเช็คชื่อ กรุณาลองอีกครั้ง
            </AlertDescription>
          </Alert>
        ) : null}

        {submitAttendance.isSuccess ? (
          <Alert variant="success">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <AlertTitle>บันทึกการเช็คชื่อเรียบร้อยแล้ว</AlertTitle>
                {newCases.length > 0 ? (
                  <AlertDescription className="max-h-16 overflow-auto">
                    ระบบสร้างเคสติดตามอัตโนมัติ {newCases.length} รายการ:{" "}
                    {newCases.map((item) => item.student_name).join(", ")}
                  </AlertDescription>
                ) : null}
              </div>
            </div>
          </Alert>
        ) : null}
      </div>

      {students.length === 0 ? (
        <EmptyState title="ไม่พบรายชื่อนักเรียนในชั้นเรียนนี้" />
      ) : (
        <AttendanceStudentTable
          onStatusChange={handleStatusChange}
          selections={selections}
          students={students}
        />
      )}

      {students.length > 0 ? (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/90 p-4 backdrop-blur lg:left-[260px]">
          <div className="mx-auto flex w-full max-w-[1000px] items-center justify-end">
            <Button
              icon={Save}
              isLoading={submitAttendance.isPending}
              loadingText="กำลังบันทึก"
              onClick={handleSave}
              size="lg"
            >
              บันทึกข้อมูล
            </Button>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
