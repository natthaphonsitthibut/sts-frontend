import { useParams } from "react-router-dom";
import { CircleAlert, MessageSquareText, SchoolIcon } from "lucide-react";
import { Card } from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { formatThaiDateTime } from "../../../lib/date-time";
import { StudentAttendanceCalendar } from "../../students/components/StudentAttendanceCalendar";
import { StudentProfileHeader } from "../../students/components/StudentProfileHeader";
import { TeacherLinkShell } from "../components/TeacherLinkShell";
import { useTeacherStudentProfile } from "../hooks/useTeacherAccess";
import { useTeacherLink } from "../hooks/useTeacherLink";
import { assignmentClassLabel } from "../lib/teacher-link-presentation";

/**
 * The staff student profile, opened from a teacher link. It renders the same
 * header, comments and attendance calendar as `/students/:id`; the data comes
 * from one grant-scoped read instead of the authenticated student APIs, and the
 * PII dialogs (contacts, address) stay closed because a link is not an account.
 */
export function TeacherStudentProfilePage() {
  const { assignmentId = "", studentUuid = "" } = useParams();
  const { context } = useTeacherLink();
  const assignment = context.assignments.find((item) => item.id === assignmentId);
  const profileQuery = useTeacherStudentProfile(Number(assignmentId), studentUuid);

  const breadcrumb = [
    { label: "หน้าหลัก", to: "/teacher-access" },
    {
      label: `ห้อง ${assignment ? assignmentClassLabel(assignment) : ""}`,
      to: `/teacher-access/classes/${assignmentId}`,
    },
  ];

  if (profileQuery.isLoading) {
    return (
      <TeacherLinkShell breadcrumb={breadcrumb} title="ข้อมูลนักเรียน">
        <Card className="mb-5 p-5">
          <SkeletonStack lines={3} />
        </Card>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card className="p-5">
            <SkeletonStack lines={4} />
          </Card>
          <Card className="p-5">
            <SkeletonStack lines={4} />
          </Card>
        </div>
      </TeacherLinkShell>
    );
  }

  if (profileQuery.isError) {
    return (
      <TeacherLinkShell breadcrumb={breadcrumb} title="ข้อมูลนักเรียน">
        <ErrorState
          description="เกิดข้อผิดพลาดระหว่างโหลดข้อมูลนักเรียน กรุณาลองใหม่อีกครั้ง"
          onRetry={() => void profileQuery.refetch()}
          title="โหลดข้อมูลนักเรียนไม่สำเร็จ"
        />
      </TeacherLinkShell>
    );
  }

  const profile = profileQuery.data;
  if (!profile?.student || !profile.summary) {
    return (
      <TeacherLinkShell breadcrumb={breadcrumb} title="ข้อมูลนักเรียน">
        <EmptyState
          description="ไม่พบข้อมูลนักเรียนคนนี้ในห้องที่ลิงก์ของคุณดูแล"
          icon={CircleAlert}
          title="ไม่พบข้อมูลนักเรียน"
        />
      </TeacherLinkShell>
    );
  }

  const observations = profile.observations?.data ?? [];

  return (
    <TeacherLinkShell breadcrumb={breadcrumb} title="ข้อมูลนักเรียน">
      <StudentProfileHeader
        key={studentUuid}
        student={profile.student}
        studentId={studentUuid}
        summary={profile.summary}
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
              <MessageSquareText aria-hidden="true" className="size-4 text-primary" />
              ความคิดเห็นจากคุณครู
            </h2>
            {observations.length === 0 ? (
              <EmptyState
                className="border-none py-6 shadow-none"
                description="ความคิดเห็นที่ครูบันทึกจะปรากฏในส่วนนี้"
                icon={MessageSquareText}
                title="ยังไม่มีความคิดเห็นจากคุณครู"
              />
            ) : (
              <ul className="space-y-3">
                {observations.slice(0, 3).map((observation) => (
                  <li
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    key={observation.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-slate-500">
                      <strong className="font-semibold text-slate-800">
                        ผู้รายงาน: {observation.author.displayName}
                      </strong>
                      <time dateTime={observation.observedAt}>
                        {formatThaiDateTime(observation.observedAt)}
                      </time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {observation.comment || "ไม่ได้ระบุความคิดเห็นเพิ่มเติม"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
              <SchoolIcon aria-hidden="true" className="size-4 text-primary" />
              ประวัติความเสี่ยง
            </h2>
            {profile.cases.length === 0 ? (
              <EmptyState
                className="border-none py-6 shadow-none"
                description="เมื่อมีเคสติดตาม รายการจะปรากฏในส่วนนี้"
                icon={CircleAlert}
                title="ยังไม่มีเคสติดตาม"
              />
            ) : (
              <ul className="space-y-3">
                {profile.cases.slice(0, 5).map((studentCase) => (
                  <li
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                    key={studentCase.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800">{studentCase.status}</span>
                      <time className="text-xs text-slate-500" dateTime={studentCase.created_at}>
                        {formatThaiDateTime(studentCase.created_at)}
                      </time>
                    </div>
                    {studentCase.reason_flagged ? (
                      <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-700">
                        {studentCase.reason_flagged}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="lg:col-span-3">
          <StudentAttendanceCalendar
            key={studentUuid}
            studentId={studentUuid}
            summary={profile.summary}
            teacherLinkAssignmentId={Number(assignmentId)}
          />
        </div>
      </div>
    </TeacherLinkShell>
  );
}
