import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { School } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Combobox, FormErrorAlert, Select } from "../../../components/base";
import {
  EmptyState,
  PageShell,
  PageToolbar,
} from "../../../components/layout/page-primitives";
import { formatRoomLabel } from "../../../lib/room-presentation";
import { useSyncedSearchParams } from "../../../hooks/useSyncedSearchParams";
import { attendanceService } from "../../attendance/api/attendance.service";
import {
  useSchoolClassroomOptions,
  useScopedSchools,
} from "../../school-structure/hooks/useSchoolStructure";
import { CheckInWorkspace } from "../components/CheckInWorkspace";

export function InternalCheckInPage() {
  const [searchParams] = useSearchParams();
  const schoolsQuery = useScopedSchools();
  const schools = useMemo(() => schoolsQuery.data ?? [], [schoolsQuery.data]);
  const [schoolInput, setSchoolInput] = useState(
    () => searchParams.get("schoolId") ?? "",
  );
  const [gradeInput, setGradeInput] = useState(
    () => searchParams.get("gradeId") ?? "",
  );
  const [classroomInput, setClassroomInput] = useState(
    () => searchParams.get("classroomId") ?? "",
  );
  const schoolId =
    Number(schools.length === 1 ? schools[0]?.id : schoolInput) || null;
  const termsQuery = useQuery({
    queryKey: ["internal-check-in", "terms", schoolId],
    queryFn: () => attendanceService.getTerms(schoolId!),
    enabled: Boolean(schoolId),
  });
  const activeTerm =
    termsQuery.data?.find((term) => term.status === "ACTIVE") ?? null;
  const classroomsQuery = useSchoolClassroomOptions(
    schoolId && activeTerm ? { schoolId, termId: Number(activeTerm.id) } : null,
  );
  const classrooms = useMemo(
    () => classroomsQuery.data ?? [],
    [classroomsQuery.data],
  );
  const gradeOptions = useMemo(
    () =>
      [
        ...new Map(
          classrooms.map((classroom) => [
            classroom.gradeLevelId,
            classroom.gradeLabel,
          ]),
        ).entries(),
      ].sort((left, right) => left[0] - right[0]),
    [classrooms],
  );
  const roomOptions = gradeInput
    ? classrooms.filter(
        (classroom) => classroom.gradeLevelId === Number(gradeInput),
      )
    : [];
  const classroomId = Number(classroomInput) || null;
  useSyncedSearchParams({
    schoolId: schools.length > 1 ? schoolInput || undefined : undefined,
    gradeId: gradeInput || undefined,
    classroomId: classroomInput || undefined,
  });

  return (
    <PageShell>
      <PageToolbar title="เช็กชื่อ" />
      <FormErrorAlert
        className="mb-4"
        error={schoolsQuery.error ?? termsQuery.error ?? classroomsQuery.error}
        fallback="โหลดตัวเลือกห้องเรียนไม่สำเร็จ"
      />
      <div className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          โรงเรียน
          <Combobox
            ariaLabel="โรงเรียน"
            disabled={schools.length <= 1}
            onChange={(value) => {
              setSchoolInput(value);
              setGradeInput("");
              setClassroomInput("");
            }}
            options={schools.map((school) => ({
              value: String(school.id),
              label: school.name,
            }))}
            placeholder="ค้นหาโรงเรียน"
            value={schoolId ? String(schoolId) : ""}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          ชั้น
          <Select
            aria-label="ชั้น"
            disabled={!activeTerm}
            onChange={(event) => {
              const value = event.target.value;
              setGradeInput(value);
              setClassroomInput("");
            }}
            value={gradeInput}
          >
            <option value="">เลือกชั้น</option>
            {gradeOptions.map(([gradeLevelId, gradeLabel]) => (
              <option key={gradeLevelId} value={String(gradeLevelId)}>
                {gradeLabel}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          ห้อง
          <Select
            aria-label="ห้อง"
            disabled={!gradeInput}
            onChange={(event) => setClassroomInput(event.target.value)}
            value={classroomInput}
          >
            <option value="">เลือกห้อง</option>
            {roomOptions.map((classroom) => (
              <option key={classroom.id} value={String(classroom.id)}>
                {classroom.roomName ?? formatRoomLabel(classroom.roomCode)}
              </option>
            ))}
          </Select>
        </label>
      </div>
      {!activeTerm && schoolId ? (
        <EmptyState
          icon={School}
          title="ยังไม่มีภาคเรียนที่เปิดใช้งาน"
          description="เปิดภาคเรียนก่อนเริ่มเช็กชื่อ"
        />
      ) : classroomId ? (
        <CheckInWorkspace access="INTERNAL" classroomId={classroomId} />
      ) : (
        <EmptyState
          icon={School}
          title="เลือกห้องเรียนเพื่อเริ่มเช็กชื่อ"
          description="บัญชีที่มีสิทธิ์เช็กชื่อจะเห็นเฉพาะห้องในขอบเขตข้อมูลของตน"
        />
      )}
    </PageShell>
  );
}
