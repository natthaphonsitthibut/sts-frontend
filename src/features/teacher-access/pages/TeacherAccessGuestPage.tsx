import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpenCheck,
  CalendarCheck,
  CheckCircle2,
  School,
  UserRoundSearch,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DatePicker,
  FormErrorAlert,
  Label,
  Select,
} from "../../../components/base";
import { GuestPageShell } from "../../../components/layout/guest-page-shell";
import {
  EmptyState,
  ErrorState,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { cn } from "../../../lib/utils";
import { getThaiDateKey } from "../../../lib/date-time";
import { formatRoomLabel } from "../../../lib/room-presentation";
import { TeacherObservationPanel } from "../../student-observations/components/TeacherObservationPanel";
import {
  teacherAccessGuestQueryKey,
  useSaveTeacherAccessAttendance,
  useTeacherAccessContext,
  useTeacherAccessRoster,
  type TeacherAccessGuestCredential,
} from "../hooks/useTeacherAccess";
import type {
  TeacherAccessAssignment,
  TeacherAccessRosterStudent,
} from "../types/teacher-access.types";

type AttendanceStatus = "P_PRESENT" | "P_ABSENT" | "P_LATE";

const ATTENDANCE_OPTIONS: Array<{
  value: AttendanceStatus;
  label: string;
  selectedClass: string;
}> = [
  { value: "P_PRESENT", label: "มา", selectedClass: "border-success-200 bg-success-100 text-success-700" },
  { value: "P_LATE", label: "สาย", selectedClass: "border-warning-200 bg-warning-100 text-warning-700" },
  { value: "P_ABSENT", label: "ขาด", selectedClass: "border-danger-200 bg-danger-100 text-danger-700" },
];

function studentName(student: TeacherAccessRosterStudent): string {
  return [student.firstName, student.lastName].filter(Boolean).join(" ") || "ไม่ระบุชื่อ";
}

function assignmentLabel(assignment: TeacherAccessAssignment): string {
  const room = `${assignment.gradeLabel} / ${assignment.roomName || formatRoomLabel(assignment.roomCode)}`;
  return assignment.subjectName ? `${room} · ${assignment.subjectName}` : room;
}

let strictRenderCredentialBuffer: TeacherAccessGuestCredential | null | undefined;

function consumeFragmentCredential(): TeacherAccessGuestCredential | null {
  const fragment = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const token = new URLSearchParams(fragment).get("token")?.trim() ?? "";

  if (window.location.hash) {
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }

  if (token) {
    const credential = { token, cacheIdentity: crypto.randomUUID() };
    strictRenderCredentialBuffer = credential;
    queueMicrotask(() => {
      if (strictRenderCredentialBuffer === credential) {
        strictRenderCredentialBuffer = undefined;
      }
    });
    return credential;
  }

  return strictRenderCredentialBuffer ?? null;
}

export function TeacherAccessGuestPage() {
  const queryClient = useQueryClient();
  const [credential] = useState(consumeFragmentCredential);
  const [assignmentInput, setAssignmentInput] = useState("");
  const [date, setDate] = useState(getThaiDateKey);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [saved, setSaved] = useState(false);
  const [observationStudent, setObservationStudent] = useState<TeacherAccessRosterStudent | null>(null);

  useEffect(() => {
    const identity = credential?.cacheIdentity;
    return () => {
      if (identity) {
        queryClient.removeQueries({ queryKey: teacherAccessGuestQueryKey(identity) });
      }
    };
  }, [credential?.cacheIdentity, queryClient]);

  const contextQuery = useTeacherAccessContext(credential);
  const assignments = useMemo(
    () => contextQuery.data?.assignments ?? [],
    [contextQuery.data?.assignments],
  );
  const selectedAssignment = useMemo(() => {
    const selected = assignments.find((assignment) => assignment.id === assignmentInput);
    return selected ?? assignments[0];
  }, [assignmentInput, assignments]);
  const selectedAssignmentId = selectedAssignment ? Number(selectedAssignment.id) : undefined;
  const rosterQuery = useTeacherAccessRoster(credential, selectedAssignmentId);
  const roster = rosterQuery.data ?? [];
  const saveAttendance = useSaveTeacherAccessAttendance(credential);
  const canRecordAttendance = selectedAssignment?.allowedActions.includes("HOMEROOM_ATTENDANCE") ?? false;
  const canRecordObservation = selectedAssignment?.allowedActions.includes("TEACHER_OBSERVATION") ?? false;

  async function submitAttendance(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedAssignmentId || roster.length === 0) return;
    await saveAttendance.mutateAsync({
      assignmentId: selectedAssignmentId,
      date,
      records: roster.map((student) => ({
        studentId: student.studentUuid,
        status: attendance[student.studentUuid] ?? "P_PRESENT",
      })),
    });
    setSaved(true);
  }

  if (contextQuery.isLoading) {
    return (
      <GuestPageShell as="main" contentClassName="max-w-4xl">
        <SkeletonStack lines={6} />
      </GuestPageShell>
    );
  }

  if (!credential) {
    return (
      <GuestPageShell as="main" centered contentClassName="max-w-lg">
        <ErrorState
          title="ลิงก์ไม่ครบถ้วน"
          description="กรุณาเปิดลิงก์ฉบับเต็มที่ได้รับจากผู้ดูแลโรงเรียน"
        />
      </GuestPageShell>
    );
  }

  if (contextQuery.isError || !contextQuery.data) {
    return (
      <GuestPageShell as="main" centered contentClassName="max-w-lg">
        <ErrorState
          title="ไม่สามารถเข้าใช้งานได้"
          description="ลิงก์อาจหมดอายุ ถูกเปลี่ยน หรือถูกเพิกถอนแล้ว กรุณาติดต่อผู้ดูแลโรงเรียน"
          onRetry={() => void contextQuery.refetch()}
        />
      </GuestPageShell>
    );
  }

  const context = contextQuery.data;

  return (
    <GuestPageShell as="main" contentClassName="max-w-4xl">
      <header className="mb-5 rounded-lg bg-primary p-5 text-white shadow-card sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <School className="size-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-white/75">พื้นที่ทำงานสำหรับครู</p>
              <h1 className="text-xl font-bold">{context.schoolName}</h1>
              <p className="mt-1 text-sm text-white/80">ปี {context.academicYear} ภาค {context.semester}</p>
            </div>
          </div>
          <div className="rounded-lg bg-white/10 px-4 py-3">
            <p className="text-xs text-white/70">เข้าใช้งานในชื่อ</p>
            <p className="font-bold">{context.teacherDisplayName}</p>
          </div>
        </div>
      </header>

      {assignments.length === 0 ? (
        <EmptyState
          icon={BookOpenCheck}
          title="ยังไม่มีงานสอนที่ใช้งานได้"
          description="กรุณาติดต่อผู้ดูแลโรงเรียนเพื่อตรวจสอบห้อง วิชา และช่วงเวลาที่ได้รับมอบหมาย"
        />
      ) : (
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>เลือกห้องหรือรายวิชา</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="teacher-assignment">งานสอน</Label>
              <Select
                id="teacher-assignment"
                value={selectedAssignment?.id ?? ""}
                onChange={(event) => {
                  setAssignmentInput(event.target.value);
                  setAttendance({});
                  setObservationStudent(null);
                  setSaved(false);
                  saveAttendance.reset();
                }}
              >
                {assignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>{assignmentLabel(assignment)}</option>
                ))}
              </Select>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedAssignment?.allowedActions.map((capability) => (
                  <Badge key={capability} variant="secondary">
                    {capability === "HOMEROOM_ATTENDANCE" ? "เช็คชื่อ" : "ข้อสังเกตครู"}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {rosterQuery.isError ? (
            <ErrorState
              title="โหลดรายชื่อนักเรียนไม่สำเร็จ"
              description="กรุณาลองโหลดรายชื่อของห้องนี้อีกครั้ง"
              onRetry={() => void rosterQuery.refetch()}
            />
          ) : rosterQuery.isLoading ? (
            <SkeletonStack lines={6} />
          ) : roster.length === 0 ? (
            <EmptyState
              icon={UserRoundSearch}
              title="ไม่พบรายชื่อนักเรียน"
              description="ห้องหรือรายวิชานี้ยังไม่มีนักเรียนที่อยู่ในสถานะใช้งาน"
            />
          ) : (
            <>
              {canRecordAttendance ? (
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <CalendarCheck className="size-5 text-primary" aria-hidden="true" />
                          เช็คชื่อนักเรียน
                        </CardTitle>
                        <p className="mt-1 text-sm text-slate-500">เริ่มต้นเป็น “มา” ทุกคน กรุณาตรวจทานก่อนบันทึก</p>
                      </div>
                      <div className="w-full sm:w-56">
                        <Label htmlFor="attendance-date">วันที่</Label>
                        <DatePicker
                          id="attendance-date"
                          ariaLabel="เลือกวันที่เช็คชื่อ"
                          value={date}
                          max={getThaiDateKey()}
                          onChange={(value) => { setDate(value); setSaved(false); }}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={(event) => void submitAttendance(event)}>
                      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                        {roster.map((student, index) => {
                          const current = attendance[student.studentUuid] ?? "P_PRESENT";
                          return (
                            <div key={student.studentUuid} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800"><span className="mr-2 text-slate-400">{index + 1}.</span>{studentName(student)}</p>
                                {student.studentStatusLabel ? <p className="mt-1 text-xs text-slate-500">{student.studentStatusLabel}</p> : null}
                              </div>
                              <div className="grid grid-cols-3 gap-2" role="group" aria-label={`สถานะของ ${studentName(student)}`}>
                                {ATTENDANCE_OPTIONS.map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    aria-pressed={current === option.value}
                                    className={cn(
                                      "min-h-10 rounded-lg border px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                      current === option.value
                                        ? option.selectedClass
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                                    )}
                                    onClick={() => {
                                      setAttendance((values) => ({ ...values, [student.studentUuid]: option.value }));
                                      setSaved(false);
                                    }}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 space-y-3">
                        <FormErrorAlert error={saveAttendance.error} fallback="ไม่สามารถบันทึกการเช็คชื่อได้" />
                        {saved ? (
                          <Alert variant="success">
                            <AlertTitle className="flex items-center gap-2"><CheckCircle2 className="size-4" aria-hidden="true" />บันทึกเรียบร้อย</AlertTitle>
                            <AlertDescription>ระบบบันทึกสถานะของนักเรียน {roster.length} คนแล้ว</AlertDescription>
                          </Alert>
                        ) : null}
                        <div className="flex justify-end">
                          <Button type="submit" isLoading={saveAttendance.isPending} loadingText="กำลังบันทึก">
                            บันทึกการเช็คชื่อ {roster.length} คน
                          </Button>
                        </div>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              ) : null}

              {canRecordObservation ? (
                observationStudent && selectedAssignmentId ? (
                  <TeacherObservationPanel
                    credential={credential}
                    assignmentId={selectedAssignmentId}
                    student={{
                      studentTermId: observationStudent.studentTermId,
                      displayName: studentName(observationStudent),
                    }}
                    onClose={() => setObservationStudent(null)}
                  />
                ) : (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle>ข้อสังเกตจากครู</CardTitle>
                      <p className="text-sm text-slate-500">เลือกนักเรียนเพื่อบันทึกและดูประวัติในขอบเขตงานสอนนี้</p>
                    </CardHeader>
                    <CardContent className="grid gap-2 sm:grid-cols-2">
                      {roster.map((student) => (
                        <Button
                          key={student.studentUuid}
                          variant="outline"
                          className="justify-start"
                          onClick={() => setObservationStudent(student)}
                        >
                          {studentName(student)}
                        </Button>
                      ))}
                    </CardContent>
                  </Card>
                )
              ) : null}
            </>
          )}
        </div>
      )}
    </GuestPageShell>
  );
}
