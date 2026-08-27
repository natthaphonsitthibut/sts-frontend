import { Card, Dialog, DialogContent } from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { formatThaiDate } from "../../../lib/date-time";
import { getCaseTrackingStatusPresentation } from "../../cases/lib/case-presentation";
import { StudentAttendanceCalendar } from "../../students/components/StudentAttendanceCalendar";
import { StudentProfileHeader } from "../../students/components/StudentProfileHeader";
import { useStudent } from "../../students/hooks/useStudent";
import { useStudentCases } from "../../students/hooks/useStudentCases";
import { useStudentProfileSummary } from "../../students/hooks/useStudentProfileSummary";
import { checkInService } from "../api/check-in.service";

/**
 * The student profile a teacher reaches from an avatar on the classroom link.
 *
 * It renders the same header, metrics and attendance calendar as the staff
 * profile — the data comes from the link's own guarded namespace, bounded by
 * the classroom the link belongs to. It opens over the roster instead of
 * navigating: attendance marked but not yet submitted lives in page state, and
 * leaving the page would throw it away.
 */
export function ClassroomStudentProfileDialog({
  onOpenChange,
  photoVersion,
  studentId,
}: {
  onOpenChange: (open: boolean) => void;
  photoVersion?: string | null;
  studentId: string | null;
}) {
  const open = Boolean(studentId);
  const { student, isLoading, isError, refetch } = useStudent(
    studentId ?? undefined,
    "CLASSROOM_LINK",
  );
  const summaryQuery = useStudentProfileSummary(
    studentId ?? undefined,
    "CLASSROOM_LINK",
  );
  const { cases } = useStudentCases(
    studentId ?? undefined,
    true,
    "CLASSROOM_LINK",
  );

  if (!open || !studentId) return null;

  const loading = isLoading || summaryQuery.isLoading;
  const failed = isError || summaryQuery.isError;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        aria-label="ข้อมูลนักเรียน"
        className="max-h-[90vh] max-w-5xl overflow-y-auto p-4 sm:p-6"
        onClose={() => onOpenChange(false)}
      >
        {loading ? (
          <SkeletonStack lines={6} />
        ) : failed || !student || !summaryQuery.data ? (
          <ErrorState
            description="เกิดข้อผิดพลาดระหว่างโหลดข้อมูลนักเรียน กรุณาลองใหม่อีกครั้ง"
            onRetry={() => {
              refetch();
              void summaryQuery.refetch();
            }}
            title="โหลดข้อมูลนักเรียนไม่สำเร็จ"
          />
        ) : (
          <div className="space-y-5">
            <StudentProfileHeader
              // A link is never anonymous — the teacher signed in with Google or
              // AraID — so asking to see a masked field is allowed here, and the
              // access log records which teacher asked.
              canRevealPii
              photoUrl={
                student.photo_url
                  ? checkInService.getStudentPhotoUrl({
                      access: "PUBLIC_LINK",
                      studentId,
                      photoVersion,
                    })
                  : null
              }
              source="CLASSROOM_LINK"
              student={student}
              studentId={studentId}
              summary={summaryQuery.data}
            />
            <StudentAttendanceCalendar
              key={studentId}
              source="CLASSROOM_LINK"
              studentId={studentId}
              summary={summaryQuery.data}
            />
            <Card className="p-5">
              <h3 className="mb-3 text-base font-bold text-slate-900">
                ประวัติเคสของนักเรียน
              </h3>
              {cases.length === 0 ? (
                <EmptyState
                  description="นักเรียนคนนี้ยังไม่เคยถูกเปิดเคสติดตาม"
                  title="ยังไม่มีเคส"
                />
              ) : (
                <ul className="space-y-2">
                  {cases.map((studentCase) => (
                    <li
                      className="rounded-lg border border-slate-200 px-4 py-3"
                      key={studentCase.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">
                          {studentCase.reason_flagged || "ไม่ระบุสาเหตุ"}
                        </span>
                        <span
                          className={`text-sm font-medium ${getCaseTrackingStatusPresentation(studentCase.status).textClassName}`}
                        >
                          {
                            getCaseTrackingStatusPresentation(
                              studentCase.status,
                            ).label
                          }
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        เปิดเคสเมื่อ {formatThaiDate(studentCase.created_at)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
