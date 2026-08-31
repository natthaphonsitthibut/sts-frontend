import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { useLocation, useParams } from "react-router-dom";
import { Badge, Card } from "../../../components/base";
import { NavButton } from "../../../components/layout/nav-button";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";
import {
  EmptyState,
  ErrorState,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { getNavigationContext } from "../../../components/layout/navigation-context";
import { StudentCaseAction } from "../../cases/components/StudentCaseAction";
import { StudentActivityPanel } from "../../students/components/StudentActivityPanel";
import { StudentAttendanceCalendar } from "../../students/components/StudentAttendanceCalendar";
import { StudentProfileHeader } from "../../students/components/StudentProfileHeader";
import { useStudent } from "../../students/hooks/useStudent";
import { useStudentCases } from "../../students/hooks/useStudentCases";
import { useStudentProfileSummary } from "../../students/hooks/useStudentProfileSummary";
import { checkInService } from "../api/check-in.service";
import { useClassroomLinkComments } from "../hooks/useClassroomLinkComments";

const SOURCE = "CLASSROOM_LINK" as const;

/**
 * The student profile as a teacher reaches it from a classroom link.
 *
 * The same page the staff see, built from the same components and bounded by
 * the link's own namespace: the classroom on the session decides which students
 * exist at all. It is a page rather than a dialog because the roster it opens
 * from is one, and the attendance a teacher has already marked survives the
 * trip — the draft is kept for the tab, not for the component.
 */
export function ClassroomLinkStudentPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const location = useLocation();
  // Back goes to whichever tab the teacher left — the roster or เช็กชื่อ —
  // because the navigation that brought them here recorded that exact URL. A
  // profile opened cold still has somewhere to go: the link's own page.
  const backTo = getNavigationContext(location.state)?.backTo ?? "/classroom";

  const contextQuery = useQuery({
    queryKey: ["check-in", "context"],
    queryFn: () => checkInService.getPublicContext(),
    retry: false,
  });
  const { student, isLoading, isError, refetch } = useStudent(
    studentId,
    SOURCE,
  );
  const summaryQuery = useStudentProfileSummary(studentId, SOURCE);
  const {
    cases,
    isError: casesError,
    isLoading: casesLoading,
    refetch: refetchCases,
  } = useStudentCases(studentId, true, SOURCE);
  const linkComments = useClassroomLinkComments(true);

  const authentication = contextQuery.data?.authentication;
  const shell = {
    profileAffiliation: contextQuery.data?.school.name ?? null,
    profileName:
      authentication?.status === "AUTHENTICATED"
        ? authentication.displayName
        : undefined,
    profilePhotoUrl:
      authentication?.status === "AUTHENTICATED"
        ? authentication.photoUrl
        : null,
  };

  const backButton = (
    <NavButton
      className="min-w-28"
      icon={ArrowLeft}
      to={backTo}
      variant="outline"
    >
      ย้อนกลับ
    </NavButton>
  );
  const activeCases = cases.filter((studentCase) =>
    ["OPEN", "IN_PROGRESS", "PENDING_REVIEW"].includes(studentCase.status),
  );
  const studentName =
    `${student?.FirstName_Onec ?? ""} ${student?.LastName_Onec ?? ""}`.trim() ||
    "นักเรียน";
  // The same toolbar the staff profile uses, so the back button and the primary
  // action sit exactly where a teacher already expects them. The breadcrumb is
  // off because it leads into the app, and whoever holds a link has no page in
  // there to go back to.
  const header = (
    <PageToolbar
      actions={
        student && studentId && !casesLoading ? (
          <StudentCaseAction
            activeCaseCount={activeCases.length}
            activeCaseId={
              activeCases.length > 0 ? Number(activeCases[0].id) : null
            }
            className="min-w-28"
            mode="button"
            source={SOURCE}
            studentId={studentId}
            studentName={studentName}
          />
        ) : undefined
      }
      hideBreadcrumb
      navigation={backButton}
      title="ข้อมูลนักเรียน"
    />
  );

  if (isLoading || summaryQuery.isLoading) {
    return (
      <GuestPageShell as="main" {...shell}>
        {header}
        <Card className="mb-5 p-5 sm:p-6">
          <SkeletonStack lines={5} />
        </Card>
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <Card className="min-h-[600px] p-5">
            <SkeletonStack lines={4} />
          </Card>
          <Card className="min-h-[600px] p-5">
            <SkeletonStack lines={4} />
          </Card>
        </div>
      </GuestPageShell>
    );
  }

  if (isError || summaryQuery.isError) {
    return (
      <GuestPageShell as="main" {...shell}>
        {header}
        <ErrorState
          description="เกิดข้อผิดพลาดระหว่างโหลดข้อมูลนักเรียน กรุณาลองใหม่อีกครั้ง"
          onRetry={() => {
            refetch();
            void summaryQuery.refetch();
          }}
          title="โหลดข้อมูลนักเรียนไม่สำเร็จ"
        />
      </GuestPageShell>
    );
  }

  if (!studentId || !student || !summaryQuery.data) {
    return (
      <GuestPageShell as="main" {...shell}>
        {header}
        <EmptyState
          description="นักเรียนคนนี้ไม่ได้อยู่ในห้องเรียนของลิงก์นี้"
          icon={CircleAlert}
          title="ไม่พบข้อมูลนักเรียน"
        />
      </GuestPageShell>
    );
  }

  return (
    <GuestPageShell as="main" {...shell}>
      {header}

      <StudentProfileHeader
        // A link is never anonymous — the teacher signed in with Google or
        // AraID first — so asking to see a masked field is allowed, and the
        // access log records which teacher asked.
        canRevealPii
        key={studentId}
        photoUrl={
          student.photo_url
            ? checkInService.getStudentPhotoUrl({
                access: "PUBLIC_LINK",
                // The student's own room, so a link that reaches several has
                // one named for the photo request to check against.
                classroomId: Number(student.classroom_id) || undefined,
                studentId,
              })
            : null
        }
        source={SOURCE}
        student={student}
        studentId={studentId}
        summary={summaryQuery.data}
      />

      <div className="mt-5 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
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
                {summaryQuery.data.careConsiderations.disadvantages.length +
                  summaryQuery.data.careConsiderations.disabilities.length}{" "}
                รายการ
              </Badge>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(
                [
                  [
                    "ความด้อยโอกาส",
                    summaryQuery.data.careConsiderations.disadvantages,
                  ],
                  [
                    "ความพิการ",
                    summaryQuery.data.careConsiderations.disabilities,
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
            // The link writes comments through its own endpoint, which records
            // the teacher it signed in as.
            canManageComments
            canViewCaseDetail={false}
            cases={cases}
            casesError={casesError}
            casesLoading={casesLoading}
            commentWriter={linkComments}
            onRetryCases={refetchCases}
            source={SOURCE}
            student={student}
            studentId={studentId}
          />
        </div>
        <div>
          <StudentAttendanceCalendar
            key={studentId}
            source={SOURCE}
            studentId={studentId}
            summary={summaryQuery.data}
          />
        </div>
      </div>
    </GuestPageShell>
  );
}
