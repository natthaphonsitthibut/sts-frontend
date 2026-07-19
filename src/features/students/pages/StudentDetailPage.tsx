import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, CircleAlert, HouseHeart, KeyRound, NotebookPen, SquarePen } from "lucide-react";
import { useParams } from "react-router-dom";
import { Badge, Button, Card, SchoolIcon } from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { LocationMapPicker } from "../../../components/maps/LocationMapPicker";
import { formatThaiDate } from "../../../lib/date-time";
import { NavButton } from "../../../components/layout/nav-button";
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { CaseStatusBadge } from "../../cases/components/CaseStatusBadge";
import { StudentCaseAction } from "../../cases/components/StudentCaseAction";
import { StudentObservationManagementPanel } from "../../student-observations/components/StudentObservationManagementPanel";
import { ObservationEntryDialog } from "../../student-observations/components/ObservationEntryDialog";
import { ManagedHomeVisitRequestPanel, ManagedObservationEntryPanel } from "../../student-observations/components/ObservationEntryPanel";
import { StudentContactPanel } from "../components/StudentContactPanel";
import { StudentProfileHeader } from "../components/StudentProfileHeader";
import { useStudent } from "../hooks/useStudent";
import { useStudentAttendanceSummary } from "../hooks/useStudentAttendanceSummary";
import { useStudentCases } from "../hooks/useStudentCases";
import type { StudentCase, StudentDetail } from "../types/students.types";

function resolveFullName(student: StudentDetail | undefined): string {
  if (!student) {
    return "";
  }
  return `${student.FirstName_Onec ?? ""} ${student.LastName_Onec ?? ""}`.trim();
}

function toDisplay(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

function AddressPanel({ student }: { student: StudentDetail }) {
  const address = typeof student.address === "string" ? student.address.trim() : "";
  const hasAddress = address.length > 0;
  const lat = student.resolved_home_lat ?? null;
  const lng = student.resolved_home_lng ?? null;
  const hasMapCoordinates = lat !== null && lng !== null;
  const isApproximate = Boolean(student.is_approximate_home_location);
  const addressDetails = (
    <dl className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <dt className="text-xs font-medium text-slate-500">จังหวัด</dt>
        <dd className="mt-1 font-semibold text-slate-800">
          {toDisplay(student.ProvinceNameThai_Onec)}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium text-slate-500">อำเภอ/เขต</dt>
        <dd className="mt-1 font-semibold text-slate-800">
          {toDisplay(student.DistrictNameThai_Onec)}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium text-slate-500">ตำบล/แขวง</dt>
        <dd className="mt-1 font-semibold text-slate-800">
          {toDisplay(student.SubDistrictNameThai_Onec)}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium text-slate-500">รหัสไปรษณีย์</dt>
        <dd className="mt-1 font-semibold text-slate-800">
          {toDisplay(student.PostalCode_Onec)}
        </dd>
      </div>
    </dl>
  );

  return (
    <div className="mb-5">
      <LocationMapPicker
        address={hasAddress ? address : undefined}
        details={addressDetails}
        emptyDescription="ยังไม่มีพิกัดบ้านจากข้อมูลนักเรียน ระบบจะแสดงหมุดเมื่อมีการบันทึกตำแหน่ง"
        emptyTitle={hasMapCoordinates ? "มีพิกัด" : "ยังไม่มีพิกัด"}
        lat={lat}
        lng={lng}
        markerLabel={isApproximate ? "พิกัดโดยประมาณ (ยังไม่ยืนยัน)" : "พิกัดที่ยืนยันแล้ว"}
        title="ที่อยู่และแผนที่"
      />
    </div>
  );
}

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "ใช้งานอยู่",
  PENDING_FIRST_LOGIN: "รอเข้าสู่ระบบครั้งแรก",
  TEMP_PASSWORD_EXPIRED: "รหัสหมดอายุ",
  DISABLED: "ปิดใช้งาน",
};

function StudentAccountPanel({
  canManageAccounts,
  canViewUsers,
  student,
  studentId,
}: {
  canManageAccounts: boolean;
  canViewUsers: boolean;
  student: StudentDetail;
  studentId: string;
}) {
  const account = student.account;
  const createAccountParams = new URLSearchParams({ studentId });
  const studentFilterParams: Array<[string, unknown]> = [
    ["schoolId", student.school_id ?? student.SchoolID_Onec],
    ["schoolName", student.school_name],
    ["grade", student.grade_label ?? student.grade],
    ["room", student.room],
  ];
  for (const [key, value] of studentFilterParams) {
    if (value !== null && value !== undefined && String(value).trim()) {
      createAccountParams.set(key, String(value));
    }
  }
  return (
    <Card className="mb-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <KeyRound className="size-4 text-primary" aria-hidden="true" />
            บัญชีนักเรียน
          </h2>
          {account ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="text-slate-500">
                ชื่อผู้ใช้: <strong className="font-semibold text-slate-800">{account.username}</strong>
              </span>
              <Badge
                variant={
                  account.lifecycle_status === "ACTIVE"
                    ? "success"
                    : account.lifecycle_status === "TEMP_PASSWORD_EXPIRED"
                      ? "warning"
                      : "secondary"
                }
              >
                {ACCOUNT_STATUS_LABELS[account.lifecycle_status] ?? account.lifecycle_status}
              </Badge>
              {account.lifecycle_status === "PENDING_FIRST_LOGIN" ? (
                <span className="text-warning-700">ต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบ</span>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">นักเรียนคนนี้ยังไม่มีบัญชีผู้ใช้</p>
          )}
        </div>
        {account && canViewUsers ? (
          <NavButton size="sm" to={`/manage-users/${account.user_id}`} variant="outline">
            ดูบัญชีผู้ใช้
          </NavButton>
        ) : !account && canManageAccounts ? (
          <NavButton
            size="sm"
            to={`/manage-student-accounts/generate?${createAccountParams.toString()}`}
            variant="outline"
          >
            ไปหน้าสร้างบัญชี
          </NavButton>
        ) : null}
      </div>
    </Card>
  );
}

function RiskHistoryPanel({
  canViewCaseDetail,
  cases,
  isError,
  isLoading,
  onRetry,
}: {
  canViewCaseDetail: boolean;
  cases: StudentCase[];
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
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
    <Card className="p-5" id="case-history">
      <h2 className="mb-4 text-base font-bold text-slate-800">
        ประวัติการติดตามนักเรียน
      </h2>

      {isLoading ? (
        <SkeletonStack lines={3} className="py-2" />
      ) : isError ? (
        <ErrorState title="โหลดประวัติการติดตามไม่สำเร็จ" onRetry={onRetry} />
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
                  <div className="text-xs text-slate-500">
                    {formatThaiDate(studentCase.created_at)}
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-700">
                    {studentCase.reason_flagged}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <CaseStatusBadge status={studentCase.status} />
                  {canViewCaseDetail ? (
                    <DetailLinkButton
                      aria-label="ดูรายละเอียดเคส"
                      iconOnly
                      title="ดูรายละเอียดเคส"
                      to={`/cases/${studentCase.id}`}
                    />
                  ) : null}
                </div>
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
  const { summary, isLoading, isError, refetch } =
    useStudentAttendanceSummary(studentId);
  const stats = summary?.stats;

  return (
    <Card className="h-full p-5">
      <h2 className="mb-4 text-base font-bold text-slate-800">
        ประวัติการเข้าเรียน
      </h2>

      {isLoading ? (
        <SkeletonStack lines={3} className="py-2" />
      ) : isError ? (
        <ErrorState title="โหลดประวัติการเข้าเรียนไม่สำเร็จ" onRetry={refetch} />
      ) : !stats || stats.total === 0 ? (
        <EmptyState
          className="border-none py-6 shadow-none"
          description="ข้อมูลการเข้าเรียนจะแสดงที่นี่หลังมีการเช็คชื่อครั้งแรก"
          icon={CalendarDays}
          title="ไม่มีข้อมูลการเข้าเรียน"
        />
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
  const { can } = usePermissions();
  const [observationOpen, setObservationOpen] = useState(false);
  const [homeVisitRequestOpen, setHomeVisitRequestOpen] = useState(false);
  const { id } = useParams<{ id: string }>();
  const studentId = id?.trim();

  const { student, isLoading, isError, refetch } = useStudent(studentId);
  const fullName = resolveFullName(student);
  const {
    cases,
    isLoading: casesLoading,
    isError: casesError,
    refetch: refetchCases,
  } = useStudentCases(studentId);
  const activeCases = useMemo(
    () => cases.filter((studentCase) => studentCase.status !== "RESOLVED"),
    [cases],
  );

  if (isLoading) {
    return (
      <PageShell>
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
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell>
        <ErrorState
          title="โหลดข้อมูลนักเรียนไม่สำเร็จ"
          description="เกิดข้อผิดพลาดระหว่างโหลดข้อมูลนักเรียน กรุณาลองใหม่อีกครั้ง"
          onRetry={refetch}
        />
      </PageShell>
    );
  }

  if (!studentId || !student) {
    return (
      <PageShell>
        <EmptyState
          icon={CircleAlert}
          title="ไม่พบข้อมูลนักเรียน"
          description="ไม่พบข้อมูลนักเรียนระเบียนหรือรหัสนี้ในระบบ"
          action={
            <NavButton to={-1} variant="outline">
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
        footerActions={
          <>
            {can("student-observations") || can("manage-student-observations") ? (
              <Button icon={NotebookPen} onClick={() => setObservationOpen(true)} size="md">
                บันทึกข้อสังเกต
              </Button>
            ) : null}
            {can("student-observations") ? (
              <Button icon={HouseHeart} onClick={() => setHomeVisitRequestOpen(true)} size="md">
                ขอเยี่ยมบ้าน
              </Button>
            ) : null}
            {can("review-cases") && !casesLoading ? (
              <StudentCaseAction
                activeCaseCount={activeCases.length}
                activeCaseId={activeCases.length > 0 ? Number(activeCases[0].id) : null}
                mode="button"
                studentId={studentId}
                studentName={fullName || "นักเรียน"}
              />
            ) : null}
            <NavButton
              disabled={!can("edit-students")}
              icon={SquarePen}
              size="md"
              title={can("edit-students") ? undefined : "ไม่มีสิทธิ์แก้ไขข้อมูลนักเรียน"}
              to={`/students/${studentId}/edit`}
            >
              แก้ไขข้อมูลนักเรียน
            </NavButton>
            <NavButton icon={ArrowLeft} size="md" to={-1} variant="outline">
              ย้อนกลับ
            </NavButton>
          </>
        }
        icon={SchoolIcon}
        title="รายละเอียดนักเรียน"
      />

      <StudentProfileHeader
        key={studentId}
        student={student}
        studentId={studentId}
      />

      <StudentAccountPanel
        canManageAccounts={can("manage-student-accounts")}
        canViewUsers={can("manage-users-list")}
        student={student}
        studentId={studentId}
      />

      <AddressPanel student={student} />

      <StudentContactPanel student={student} />

      {can("manage-student-observations") ? (
        <StudentObservationManagementPanel
          studentTermId={studentId}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <RiskHistoryPanel
          canViewCaseDetail={can("review-cases")}
          cases={cases}
          isError={casesError}
          isLoading={casesLoading}
          onRetry={refetchCases}
        />
        {studentId ? <AttendancePanel studentId={studentId} /> : null}
      </div>
      <ObservationEntryDialog
        open={observationOpen}
        title="บันทึกข้อสังเกตจากรายละเอียดนักเรียน"
        onClose={() => setObservationOpen(false)}
      >
        {studentId ? (
          <ManagedObservationEntryPanel
            studentName={fullName || "นักเรียน"}
            studentTermId={studentId}
          />
        ) : null}
      </ObservationEntryDialog>
      <ObservationEntryDialog
        open={homeVisitRequestOpen}
        title="ส่งคำขอเยี่ยมบ้าน"
        onClose={() => setHomeVisitRequestOpen(false)}
      >
        {studentId ? <ManagedHomeVisitRequestPanel studentTermId={studentId} /> : null}
      </ObservationEntryDialog>
    </PageShell>
  );
}
