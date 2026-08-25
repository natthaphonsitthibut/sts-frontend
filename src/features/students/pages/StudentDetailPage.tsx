import { useMemo, useState } from "react";
import { ArrowLeft, CircleAlert, SquarePen } from "lucide-react";
import { useParams } from "react-router-dom";
import { Badge, Card, SchoolIcon } from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { useSafeBackTarget } from "../../../components/layout/navigation-context";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { StudentCaseAction } from "../../cases/components/StudentCaseAction";
import { StudentActivityPanel } from "../components/StudentActivityPanel";
import { StudentAttendanceCalendar } from "../components/StudentAttendanceCalendar";
import {
  StudentContactDialog,
  StudentLocationDialog,
} from "../components/StudentProfileDialogs";
import { StudentProfileHeader } from "../components/StudentProfileHeader";
import { useStudent } from "../hooks/useStudent";
import { useStudentCases } from "../hooks/useStudentCases";
import { useStudentProfileSummary } from "../hooks/useStudentProfileSummary";

export function StudentDetailPage() {
  const { can } = usePermissions();
  const safeBackTarget = useSafeBackTarget();
  const { id } = useParams<{ id: string }>();
  const studentId = id?.trim();
  const [contactsOpen, setContactsOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  const { student, isLoading, isError, refetch } = useStudent(studentId);
  const profileSummaryQuery = useStudentProfileSummary(studentId);
  const {
    cases,
    isLoading: casesLoading,
    isError: casesError,
    refetch: refetchCases,
  } = useStudentCases(studentId);
  const activeCases = useMemo(
    () =>
      cases.filter((studentCase) =>
        ["OPEN", "IN_PROGRESS", "PENDING_REVIEW"].includes(studentCase.status),
      ),
    [cases],
  );

  if (isLoading || profileSummaryQuery.isLoading) {
    // Mirrors the loaded page's grid (profile header, then two equal halves) so
    // the swap from skeleton to real content doesn't shift the page height —
    // a mismatched skeleton is what makes that transition read as a jump.
    return (
      <PageShell>
        <Card className="mb-5 p-5 sm:p-6">
          <SkeletonStack lines={5} />
        </Card>
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <Card className="min-h-[700px] p-5">
            <SkeletonStack lines={4} />
          </Card>
          <Card className="min-h-[700px] p-5">
            <SkeletonStack lines={4} />
          </Card>
        </div>
      </PageShell>
    );
  }

  if (isError || profileSummaryQuery.isError) {
    return (
      <PageShell>
        <ErrorState
          title="โหลดข้อมูลนักเรียนไม่สำเร็จ"
          description="เกิดข้อผิดพลาดระหว่างโหลดข้อมูลนักเรียน กรุณาลองใหม่อีกครั้ง"
          onRetry={() => {
            refetch();
            void profileSummaryQuery.refetch();
          }}
        />
      </PageShell>
    );
  }

  if (!studentId || !student || !profileSummaryQuery.data) {
    return (
      <PageShell>
        <EmptyState
          icon={CircleAlert}
          title="ไม่พบข้อมูลนักเรียน"
          description="ไม่พบข้อมูลนักเรียนระเบียนหรือรหัสนี้ในระบบ"
          action={
            <NavButton to={safeBackTarget} variant="outline">
              ย้อนกลับ
            </NavButton>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageToolbar
        actions={
          <div className="flex items-center gap-2">
            {can("dashboard") && !casesLoading ? (
              <StudentCaseAction
                activeCaseCount={activeCases.length}
                activeCaseId={
                  activeCases.length > 0 ? Number(activeCases[0].id) : null
                }
                className="min-w-28"
                mode="button"
                studentId={studentId}
                studentName={
                  `${student.FirstName_Onec ?? ""} ${student.LastName_Onec ?? ""}`.trim() ||
                  "นักเรียน"
                }
              />
            ) : null}
            {can("manage-students") ? (
              <NavButton
                contextual
                icon={SquarePen}
                to={`/manage-students/${studentId}/edit`}
              >
                แก้ไขข้อมูล
              </NavButton>
            ) : null}
          </div>
        }
        icon={SchoolIcon}
        navigation={
          <NavButton
            className="min-w-28"
            icon={ArrowLeft}
            to={safeBackTarget}
            variant="outline"
          >
            ย้อนกลับ
          </NavButton>
        }
        title="ข้อมูลนักเรียน"
      />

      <StudentProfileHeader
        canEditPhoto={can("students") || can("manage-students")}
        canRevealPii={can("manage-students")}
        contactsOpen={contactsOpen}
        key={studentId}
        locationOpen={locationOpen}
        onOpenContacts={() => setContactsOpen(true)}
        onOpenLocation={() => setLocationOpen(true)}
        student={student}
        studentId={studentId}
        summary={profileSummaryQuery.data}
      />

      {/* Two equal halves: everything that happened to the student on the left,
          their attendance on the right. `items-stretch` makes both columns the
          height of the taller one, so the left card ends level with the
          calendar instead of being measured against it in JS. */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        <div className="flex min-h-0 flex-col gap-5">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">
                  ข้อมูลประกอบการดูแล
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  รายการที่ผ่านการยืนยันแล้วจากข้อมูลนักเรียนและรอบติดตาม
                </p>
              </div>
              <Badge variant="secondary">
                {profileSummaryQuery.data.careConsiderations.disadvantages
                  .length +
                  profileSummaryQuery.data.careConsiderations.disabilities
                    .length}{" "}
                รายการ
              </Badge>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(
                [
                  [
                    "ความด้อยโอกาส",
                    profileSummaryQuery.data.careConsiderations.disadvantages,
                  ],
                  [
                    "ความพิการ",
                    profileSummaryQuery.data.careConsiderations.disabilities,
                  ],
                ] as const
              ).map(([label, items]) => (
                <section className="rounded-lg bg-slate-50 p-3" key={label}>
                  <h3 className="text-sm font-semibold text-slate-700">
                    {label}
                  </h3>
                  {items.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {items.map((item) => (
                        <Badge key={item.code} variant="default">
                          {item.labelTh}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      ไม่มีรายการที่ยืนยันแล้ว
                    </p>
                  )}
                </section>
              ))}
            </div>
          </Card>
          <StudentActivityPanel
            canManageComments={can("manage-students")}
            canViewCaseDetail={can("dashboard")}
            cases={cases}
            casesError={casesError}
            casesLoading={casesLoading}
            onRetryCases={refetchCases}
            student={student}
            studentId={studentId}
          />
        </div>
        <div>
          <StudentAttendanceCalendar
            key={studentId}
            studentId={studentId}
            summary={profileSummaryQuery.data}
          />
        </div>
      </div>

      <StudentContactDialog
        onOpenChange={setContactsOpen}
        open={contactsOpen}
        student={student}
      />
      <StudentLocationDialog
        onOpenChange={setLocationOpen}
        open={locationOpen}
        student={student}
      />
    </PageShell>
  );
}
