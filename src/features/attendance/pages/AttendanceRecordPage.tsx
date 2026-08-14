import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardList, Save, TriangleAlert } from "lucide-react";
import { useParams } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
} from "../../../components/base";
import {
  EmptyState,
  PAGE_MAX_WIDTH_CLASS,
  PageShell,
  PageToolbar,
  SkeletonStack,
  SkeletonTable,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { formatStudentRoom } from "../../students/lib/student-presentation";
import { AttendanceStudentTable } from "../components/AttendanceStudentTable";
import { useAttendanceClassRoster } from "../hooks/useAttendanceClassRoster";
import { useSubmitAttendance } from "../hooks/useSubmitAttendance";
import type { AttendanceSelectionStatus } from "../types/attendance.types";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import { AttendanceCountBadges } from "../components/AttendanceCountBadges";
import { countAttendanceStatuses } from "../lib/attendance-presentation";

export function AttendanceRecordPage() {
  const attendanceStatusCatalog = useStatusCatalog("ATTENDANCE_RECORD").items;
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

  const counts = useMemo(
    () =>
      countAttendanceStatuses(
        students.map((student) => selections[student.id] ?? "P_PRESENT"),
      ),
    [students, selections],
  );

  function handleSave(): void {
    const records = students.map((student) => ({
      student_id: student.id,
      status: selections[student.id] ?? "P_PRESENT",
    }));
    submitAttendance.mutate(records);
  }

  if (isLoading) {
    return (
      <PageShell>
        <Card className="mb-6 p-6">
          <SkeletonStack lines={2} />
        </Card>
        <SkeletonTable rows={8} />
      </PageShell>
    );
  }

  if (isError || notFound || !task) {
    return (
      <PageShell>
        <EmptyState
          icon={TriangleAlert}
          title="ไม่พบชั้นเรียนนี้"
          description="ไม่พบข้อมูลชั้นเรียนสำหรับการเช็คชื่อ"
          action={
            <NavButton
              icon={ArrowLeft}
              to="/attendance"
              variant="outline"
            >
              กลับไปแดชบอร์ด
            </NavButton>
          }
        />
      </PageShell>
    );
  }

  const newCases = submitAttendance.data?.newCases ?? [];

  return (
    <PageShell className="pb-28">
      <PageToolbar
        actions={<AttendanceCountBadges catalog={attendanceStatusCatalog} counts={counts} />}
        icon={ClipboardList}
        navigation={
          <NavButton icon={ArrowLeft} to="/attendance" variant="outline">
            ย้อนกลับ
          </NavButton>
        }
        title={`${task.target_grade || "-"} ${formatStudentRoom(task.target_room)}`}
      >
        <p className="text-sm text-content-secondary">
          {task.target_school_name || "-"} · นักเรียน {students.length} คน
        </p>
      </PageToolbar>

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
        <EmptyState
          description="ชั้นเรียนนี้ยังไม่มีรายชื่อนักเรียนในระบบ"
          icon={ClipboardList}
          title="ไม่พบรายชื่อนักเรียนในชั้นเรียนนี้"
        />
      ) : (
        <AttendanceStudentTable
          onStatusChange={handleStatusChange}
          selections={selections}
          students={students}
        />
      )}

      {students.length > 0 ? (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/90 p-4 backdrop-blur lg:left-[260px]">
          <div className={`mx-auto flex w-full items-center justify-end ${PAGE_MAX_WIDTH_CLASS}`}>
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
