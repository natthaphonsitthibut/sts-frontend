import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CircleAlert, GraduationCap, SquarePen } from "lucide-react";
import { useParams } from "react-router-dom";
import { Button, Card } from "../../../components/base";
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
import { usePermissions } from "../../auth/hooks/usePermissions";
import { CaseStatusBadge } from "../../cases/components/CaseStatusBadge";
import { geoService } from "../../tasks/api/geo.service";
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

function readCoordinate(student: StudentDetail, keys: string[]): number | null {
  for (const key of keys) {
    const value = student[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function AddressPanel({ student }: { student: StudentDetail }) {
  const address = typeof student.address === "string" ? student.address.trim() : "";
  const hasAddress = address.length > 0;
  const storedLat = readCoordinate(student, ["address_latitude", "student_lat", "lat", "latitude"]);
  const storedLng = readCoordinate(student, ["address_longitude", "student_lng", "lng", "longitude"]);
  const hasStoredCoordinates = storedLat !== null && storedLng !== null;
  const geocodeQuery = useQuery({
    queryKey: ["students", "detail-address-geocode", address],
    queryFn: () => geoService.geocodeProfileAddress(address),
    enabled: hasAddress && !hasStoredCoordinates,
    retry: false,
    staleTime: 1000 * 60 * 10,
  });
  const fallbackLat = geocodeQuery.data?.lat ?? null;
  const fallbackLng = geocodeQuery.data?.lng ?? null;
  const lat = storedLat ?? fallbackLat;
  const lng = storedLng ?? fallbackLng;
  const hasMapCoordinates = lat !== null && lng !== null;
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
        emptyDescription={
          geocodeQuery.isFetching
            ? "กำลังค้นหาพิกัดจากที่อยู่"
            : "ยังไม่มีพิกัดบ้านจากข้อมูลนักเรียน ระบบจะแสดงหมุดเมื่อมีการบันทึกตำแหน่ง"
        }
        emptyTitle={
          geocodeQuery.isFetching
            ? "กำลังค้นหา"
            : hasMapCoordinates
              ? "มีพิกัด"
              : "ยังไม่มีพิกัด"
        }
        lat={lat}
        lng={lng}
        markerLabel={hasStoredCoordinates ? "พิกัดที่ยืนยันแล้ว" : "พิกัดจากที่อยู่"}
        title="ที่อยู่และแผนที่"
      />
    </div>
  );
}

function RiskHistoryPanel({
  cases,
  isError,
  isLoading,
  onRetry,
}: {
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
    <Card className="p-5">
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
  const { can } = usePermissions();
  const { id } = useParams<{ id: string }>();
  const studentId = id?.trim();

  const { student, isLoading, isError, refetch } = useStudent(studentId);
  const fullName = resolveFullName(student);
  const {
    cases,
    isLoading: casesLoading,
    isError: casesError,
    refetch: refetchCases,
  } = useStudentCases(fullName || undefined);

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
            <NavButton
              disabled={!can("edit-students")}
              icon={SquarePen}
              title={can("edit-students") ? undefined : "ไม่มีสิทธิ์แก้ไขข้อมูลนักเรียน"}
              to={`/students/${studentId}/edit`}
            >
              แก้ไขข้อมูลนักเรียน
            </NavButton>
            <NavButton icon={ArrowLeft} to={-1} variant="outline">
              ย้อนกลับ
            </NavButton>
          </>
        }
        icon={GraduationCap}
        title="รายละเอียดนักเรียน"
      />

      <StudentProfileHeader
        key={studentId}
        student={student}
        studentId={studentId}
      />

      <AddressPanel student={student} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <RiskHistoryPanel
          cases={cases}
          isError={casesError}
          isLoading={casesLoading}
          onRetry={refetchCases}
        />
        {studentId ? <AttendancePanel studentId={studentId} /> : null}
      </div>
    </PageShell>
  );
}
