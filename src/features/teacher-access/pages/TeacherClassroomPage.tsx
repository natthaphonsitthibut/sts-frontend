import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  History,
  MessageSquareText,
  UserRound,
  Wrench,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  DatePicker,
  DropdownMenu,
  FormErrorAlert,
  IconButton,
  Label,
  Select,
  Skeleton,
  Tabs,
  useConfirm,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import { useContextualNavigate } from "../../../components/layout/navigation-context";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  SearchInput,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import {
  PAGE_ICONS,
  PAGE_IDENTITIES,
} from "../../../components/layout/page-identity";
import { NavButton } from "../../../components/layout/nav-button";
import { LinkShareDialog } from "../../../components/layout/link-share-dialog";
import { getThaiDateKey } from "../../../lib/date-time";
import { useBlobObjectUrl } from "../../../hooks/useBlobObjectUrl";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { AttendanceCountBadges } from "../../attendance/components/AttendanceCountBadges";
import { AttendanceMarkToolbar } from "../../attendance/components/AttendanceMarkToolbar";
import { AttendanceImportDialog } from "../../attendance/components/AttendanceImportDialog";
import { AttendanceQrScannerDialog } from "../../attendance/components/AttendanceQrScannerDialog";
import { formatThaiDate } from "../../../lib/date-time";
import { AttendanceDelegationDialog } from "../../attendance/components/AttendanceDelegationDialog";
import { AttendanceDelegationSection } from "../../attendance/components/AttendanceDelegationSection";
import { AttendanceRosterTable } from "../../attendance/components/AttendanceRosterTable";
import { useAttendanceMarks } from "../../attendance/hooks/useAttendanceMarks";
import { countAttendanceStatuses } from "../../attendance/lib/attendance-presentation";
import { getAttendanceSaveConfirm } from "../../attendance/lib/attendance-save-confirm";
import { getPeriodTimeLabel } from "../../timetable/lib/period-times";
import { teacherAccessService } from "../api/teacher-access.service";
import type { AttendanceSelectionStatus } from "../../attendance/types/attendance.types";
import { usePublicAttendanceStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import { ClassroomStudentCommentDialog } from "../../school-structure/components/ClassroomStudentCommentDialog";
import { ClassroomTableExportDialog } from "../../school-structure/components/ClassroomTableExportDialog";
import {
  RISK_TIER_ORDER,
  RISK_TIER_PRESENTATION,
} from "../../students/lib/risk-tier-presentation";
import { TeacherLinkShell } from "../components/TeacherLinkShell";
import { TeacherAccessStudentAvatar } from "../components/TeacherAccessStudentAvatar";
import { StudentCommentCell } from "../../students/components/StudentCommentCell";
import {
  useCreateTeacherStudentComment,
  usePublicTeacherAttendanceDelegationOptions,
  useRevokePublicTeacherAttendanceDelegation,
  useRecordTeacherClassroomExport,
  useSaveTeacherAccessAttendance,
  useTeacherAccessAttendanceCalendar,
  useTeacherAccessAttendanceSession,
  useTeacherAccessAttendanceSlots,
  useTeacherAccessRoster,
  useTeacherSchedule,
  useTeacherStudentPhoto,
  useUpdatePublicTeacherAttendanceDelegation,
} from "../hooks/useTeacherAccess";
import { useTeacherLink } from "../hooks/useTeacherLink";
import {
  assignmentClassLabel,
  assignmentSubjectLabel,
  studentDisplayName,
} from "../lib/teacher-link-presentation";
import type { TeacherAccessRosterStudent } from "../types/teacher-access.types";

type AttendanceStatus = Exclude<AttendanceSelectionStatus, "NONE">;
const STUDENTS_ICON = PAGE_IDENTITIES["/students"].icon;
const CLASSROOM_ICON = PAGE_ICONS["school-building"];
const ROSTER_EXPORT_COLUMNS = [
  { key: "order", label: "ลำดับ" },
  { key: "studentNumber", label: "รหัสประจำตัว" },
  { key: "name", label: "ชื่อ-นามสกุล" },
  { key: "comment", label: "หมายเหตุ" },
  { key: "status", label: "สถานะความเสี่ยง" },
] as const;

function rosterSortValue(
  student: TeacherAccessRosterStudent,
  key: string,
): string {
  if (key === "studentNumber") return student.studentNumber ?? "";
  if (key === "name") return studentDisplayName(student);
  if (key === "comment") return student.teacherComment ?? "";
  if (key === "status") {
    return RISK_TIER_PRESENTATION[student.riskTier ?? "NORMAL"]?.label ?? "";
  }
  return "";
}

function sortRoster(
  students: readonly TeacherAccessRosterStudent[],
  sort: DataTableSortState | undefined,
): TeacherAccessRosterStudent[] {
  if (!sort) return [...students];
  return [...students].sort((a, b) => {
    const result = rosterSortValue(a, sort.key).localeCompare(
      rosterSortValue(b, sort.key),
      "th",
    );
    return sort.direction === "asc" ? result : -result;
  });
}

/**
 * One class as the teacher sees it through their link — the same two views the
 * school staff get on ห้องเรียนทั้งหมด (รายชื่อ / เช็กชื่อ), minus the actions a
 * link holder must not have. QR, delegation and file import arrive with their
 * own features; the เครื่องมือ menu only lists what already works.
 */
export function TeacherClassroomPage() {
  const navigate = useNavigate();
  const contextualNavigate = useContextualNavigate();
  const { assignmentId = "" } = useParams();
  const { credential, context } = useTeacherLink();
  const attendanceOnly = context.accessScope === "ATTENDANCE_ONLY";
  const attendanceRoute = attendanceOnly
    ? `/teacher-access/attendance/${assignmentId}/check-in`
    : `/teacher-access/classes/${assignmentId}/check-in`;
  // The link has no session, so colours come from the public catalog endpoint —
  // the authenticated one would 401 and silently fall back to default styling.
  const attendanceStatusCatalog = usePublicAttendanceStatusCatalog().data ?? [];
  const [tab, setTab] = useRouteTab(
    {
      roster: attendanceOnly
        ? `/teacher-access/attendance/${assignmentId}/roster`
        : `/teacher-access/classes/${assignmentId}/roster`,
      attendance: attendanceRoute,
    },
    attendanceOnly ? "attendance" : "roster",
  );
  const [search, setSearch] = useState("");
  const [riskTier, setRiskTier] = useState("");
  const [date, setDate] = useState(getThaiDateKey);
  const [timetableSlotId, setTimetableSlotId] = useState("");
  const [saved, setSaved] = useState(false);
  const [rosterSort, setRosterSort] = useState<DataTableSortState | undefined>({
    key: "studentNumber",
    direction: "asc",
  });
  const [attendanceSort, setAttendanceSort] = useState<
    DataTableSortState | undefined
  >({
    key: "studentNumber",
    direction: "asc",
  });
  const [exportOpen, setExportOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [delegationOpen, setDelegationOpen] = useState(false);
  const [delegationShare, setDelegationShare] = useState<{
    accessUrl: string;
    description: string;
  } | null>(null);
  const [commentStudent, setCommentStudent] =
    useState<TeacherAccessRosterStudent | null>(null);
  const commentPhotoQuery = useTeacherStudentPhoto(
    Number(assignmentId) || undefined,
    commentStudent?.studentUuid,
    Boolean(commentStudent?.hasPhoto),
  );
  const commentPhotoUrl = useBlobObjectUrl(commentPhotoQuery.data);
  const createComment = useCreateTeacherStudentComment(
    Number(assignmentId) || 0,
  );
  const recordExport = useRecordTeacherClassroomExport();

  const assignment = context.assignments.find(
    (item) => item.id === assignmentId,
  );
  const canRecordAttendance =
    assignment?.allowedActions.some(
      (action) =>
        action === "HOMEROOM_ATTENDANCE" || action === "SUBJECT_ATTENDANCE",
    ) ?? false;
  useEffect(() => {
    if (assignment && tab === "attendance" && !canRecordAttendance) {
      void navigate(`/teacher-access/classes/${assignmentId}/roster`, {
        replace: true,
      });
    }
  }, [
    assignment,
    assignmentId,
    attendanceOnly,
    attendanceRoute,
    canRecordAttendance,
    navigate,
    tab,
  ]);
  const rosterQuery = useTeacherAccessRoster(
    credential,
    Number(assignmentId) || undefined,
  );
  const saveAttendance = useSaveTeacherAccessAttendance(credential);
  const { confirm, dialog: confirmDialog } = useConfirm();
  const attendanceSlotsQuery = useTeacherAccessAttendanceSlots(
    credential,
    Number(assignmentId) || undefined,
    date,
    assignment?.assignmentKind === "SUBJECT",
  );
  const teacherScheduleQuery = useTeacherSchedule(!attendanceOnly);
  const attendanceCalendarQuery = useTeacherAccessAttendanceCalendar(
    credential,
    { assignmentId: Number(assignmentId) || undefined, date },
    Boolean(
      assignment?.assignmentKind === "SUBJECT" &&
      canRecordAttendance &&
      tab === "attendance",
    ),
  );
  const attendanceDelegationOptions =
    usePublicTeacherAttendanceDelegationOptions(
      credential,
      { assignmentId: Number(assignmentId) || undefined, attendanceDate: date },
      Boolean(
        !attendanceOnly &&
        canRecordAttendance &&
        assignmentId &&
        tab === "attendance",
      ),
    );
  const updateAttendanceDelegation =
    useUpdatePublicTeacherAttendanceDelegation(credential);
  const revokeAttendanceDelegation =
    useRevokePublicTeacherAttendanceDelegation(credential);
  const roster = useMemo(() => rosterQuery.data ?? [], [rosterQuery.data]);
  const filteredRoster = useMemo(() => {
    const term = search.trim().toLowerCase();
    return roster.filter((student) => {
      const matchesSearch =
        !term ||
        `${studentDisplayName(student)} ${student.studentNumber ?? ""}`
          .toLowerCase()
          .includes(term);
      const matchesTier =
        !riskTier || (student.riskTier ?? "NORMAL") === riskTier;
      return matchesSearch && matchesTier;
    });
  }, [roster, riskTier, search]);
  const visibleRoster = useMemo(
    () => sortRoster(filteredRoster, rosterSort),
    [filteredRoster, rosterSort],
  );
  const visibleAttendanceRoster = useMemo(() => {
    return sortRoster(filteredRoster, attendanceSort);
  }, [attendanceSort, filteredRoster]);
  // The import form follows the order on screen, but never the search/tier
  // filters: a form that silently omits students is not a form for this class.
  const importRoster = useMemo(
    () => sortRoster(roster, attendanceSort),
    [attendanceSort, roster],
  );

  const isAttendanceSlotFetching =
    assignment?.assignmentKind === "SUBJECT" && attendanceSlotsQuery.isFetching;
  const attendanceSlots = isAttendanceSlotFetching
    ? []
    : (attendanceSlotsQuery.data ?? []);
  const requiresPeriodSelection =
    assignment?.assignmentKind === "SUBJECT" && attendanceSlots.length > 1;
  const hasScheduledSubjectSlot =
    assignment?.assignmentKind !== "SUBJECT" || attendanceSlots.length > 0;
  const selectedTimetableSlotId = requiresPeriodSelection
    ? Number(timetableSlotId) || undefined
    : attendanceSlots[0]?.id;
  const selectedAttendanceSlot = teacherScheduleQuery.data?.slots.find(
    (slot) => Number(slot.id) === attendanceSlots[0]?.id,
  );
  const selectedAttendanceSlotLabel = selectedAttendanceSlot
    ? `${selectedAttendanceSlot.subject_name_th} · คาบ ${selectedAttendanceSlot.period} (${getPeriodTimeLabel(
        teacherScheduleQuery.data?.periodTimes ?? [],
        selectedAttendanceSlot.day_of_week,
        selectedAttendanceSlot.period,
      )})`
    : `${assignment ? assignmentSubjectLabel(assignment) : "รายวิชา"} · คาบ ${attendanceSlots[0]?.period ?? "-"}`;

  const sessionQuery = useTeacherAccessAttendanceSession(
    credential,
    {
      assignmentId: Number(assignmentId) || undefined,
      date,
      ...(selectedTimetableSlotId
        ? { timetableSlotId: selectedTimetableSlotId }
        : {}),
    },
    Boolean(
      canRecordAttendance &&
      tab === "attendance" &&
      hasScheduledSubjectSlot &&
      (!requiresPeriodSelection || selectedTimetableSlotId),
    ),
  );
  const isAttendanceDateChanging =
    isAttendanceSlotFetching ||
    attendanceCalendarQuery.isFetching ||
    sessionQuery.isFetching;
  const session = sessionQuery.data?.session ?? null;
  const canRecordOnSelectedDate =
    assignment?.assignmentKind === "SUBJECT"
      ? (attendanceCalendarQuery.data?.calendar.canRecord ?? false)
      : (sessionQuery.data?.calendar.canRecord ?? false);
  const canEditAttendance =
    hasScheduledSubjectSlot &&
    canRecordOnSelectedDate &&
    session?.status !== "SUBMITTED";

  const rosterIds = roster.map((student) => student.studentUuid);
  const serverMarks = Object.fromEntries(
    (sessionQuery.data?.marks ?? [])
      .filter((mark) => mark.status !== "NONE")
      .map((mark) => [
        mark.studentUuid,
        {
          status: mark.status as AttendanceStatus,
          markedAt: mark.markedAt ?? "",
        },
      ]),
  );

  const marks = useAttendanceMarks({
    serverMarks,
    rosterIds,
    sessionKey: `teacher-link:${assignmentId}:${date}:${selectedTimetableSlotId ?? "daily"}`,
    transport: {
      saveMarks: async (batch) => {
        await teacherAccessService.saveAttendanceMarks(credential, {
          assignmentId: Number(assignmentId),
          ...(selectedTimetableSlotId
            ? { timetableSlotId: selectedTimetableSlotId }
            : {}),
          date,
          records: batch
            .filter((entry) => entry.mark !== null)
            .map(({ studentId, mark }) => ({
              studentId,
              status: mark!.status,
              markedAt: mark!.markedAt || null,
            })),
          clearedStudentIds: batch
            .filter((entry) => entry.mark === null)
            .map((entry) => entry.studentId),
        });
      },
    },
    enabled: canEditAttendance,
  });
  const counts = countAttendanceStatuses(
    rosterIds.map((studentId) => marks.marks[studentId]?.status ?? "NONE"),
  );

  if (!assignment) {
    return (
      <TeacherLinkShell centered contentClassName="max-w-lg">
        <ErrorState
          description="ห้องนี้ไม่ได้อยู่ในลิงก์ของคุณ หรือถูกปิดใช้งานแล้ว"
          title="ไม่พบห้องเรียน"
        />
      </TeacherLinkShell>
    );
  }

  const classroomLabel = assignmentClassLabel(assignment);

  async function submitAttendance(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (roster.length === 0 || !canEditAttendance || marks.unmarkedCount > 0)
      return;
    if (
      !hasScheduledSubjectSlot ||
      (requiresPeriodSelection && !selectedTimetableSlotId)
    )
      return;

    const confirmed = await confirm(getAttendanceSaveConfirm(counts));
    if (!confirmed) return;

    // Flush pending taps first so the submitted round matches what the teacher
    // sees on screen, not just what happened to reach the server already.
    const flushed = await marks.flush();
    if (!flushed) return;
    try {
      await saveAttendance.mutateAsync({
        assignmentId: Number(assignmentId),
        ...(selectedTimetableSlotId
          ? { timetableSlotId: selectedTimetableSlotId }
          : {}),
        date,
        records: roster.map((student) => ({
          studentId: student.studentUuid,
          status: marks.marks[student.studentUuid].status,
          markedAt: marks.marks[student.studentUuid].markedAt || null,
        })),
      });
    } catch {
      // The page renders the mutation error. Do not continue into the success
      // path or leave an unhandled rejected promise in the browser console.
      return;
    }
    marks.reset();
    await sessionQuery.refetch();
    setSaved(true);
  }

  return (
    <TeacherLinkShell
      breadcrumb={[
        {
          label: "ห้องเรียนของฉัน",
          icon: PAGE_ICONS["school-building"],
          to: "/teacher-access",
        },
      ]}
      breadcrumbTitle={`ห้อง ${classroomLabel}`}
      icon={CLASSROOM_ICON}
      navigation={
        attendanceOnly ? undefined : (
          <NavButton icon={ArrowLeft} to="/teacher-access" variant="outline">
            ย้อนกลับ
          </NavButton>
        )
      }
      title={
        <>
          ห้อง {classroomLabel}{" "}
          <span className="text-lg font-medium text-slate-500">
            ({assignmentSubjectLabel(assignment)})
          </span>
        </>
      }
    >
      <div className="mb-6">
        <Tabs
          aria-label="ข้อมูลห้องเรียน"
          className="flex w-full"
          onChange={setTab}
          options={[
            { value: "roster", label: "รายชื่อ" },
            ...(canRecordAttendance
              ? [{ value: "attendance", label: "เช็กชื่อ" }]
              : []),
          ]}
          value={tab}
        />
      </div>

      <ToolbarControls className="mb-5">
        <SearchInput
          className="sm:max-w-[560px]"
          onChange={setSearch}
          placeholder="ค้นหา"
          value={search}
        />
        {tab === "roster" ? (
          <>
            <FilterSelect
              ariaLabel="กรองสถานะความเสี่ยง"
              onChange={setRiskTier}
              value={riskTier}
            >
              <option value="">สถานะทั้งหมด</option>
              {RISK_TIER_ORDER.map((value) => (
                <option key={value} value={value}>
                  {RISK_TIER_PRESENTATION[value].label}
                </option>
              ))}
            </FilterSelect>
            {!attendanceOnly ? (
              <Button
                className="sm:ml-auto"
                disabled={visibleRoster.length === 0}
                icon={Download}
                onClick={() => setExportOpen(true)}
              >
                ดาวน์โหลดข้อมูล
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <DropdownMenu
              align="start"
              ariaLabel="เครื่องมือการเช็กชื่อ"
              items={[
                {
                  id: "qr",
                  label: "สแกน QR Code เพื่อเช็กชื่อ",
                  // A submitted round is read-only, so the tools that write into
                  // it are off until it is reopened.
                  disabled:
                    !canEditAttendance ||
                    rosterQuery.isLoading ||
                    roster.length === 0,
                  onSelect: () => setQrScannerOpen(true),
                },
                ...(!attendanceOnly
                  ? [
                      {
                        id: "delegate",
                        label: "มอบหมายการเช็กชื่อ",
                        disabled:
                          !canEditAttendance ||
                          !canRecordAttendance ||
                          attendanceDelegationOptions.isFetching ||
                          attendanceDelegationOptions.isError ||
                          !attendanceDelegationOptions.data?.assignments.length,
                        onSelect: () => setDelegationOpen(true),
                      },
                    ]
                  : []),
                // Importing a file is part of checking in, so a delegated
                // attendance-only link gets it too.
                {
                  id: "import",
                  label: "นำเข้าไฟล์การเช็กชื่อ",
                  disabled:
                    !canEditAttendance ||
                    rosterQuery.isLoading ||
                    roster.length === 0,
                  onSelect: () => setImportOpen(true),
                },
              ]}
              trigger={(triggerProps) => (
                <Button {...triggerProps} icon={Wrench} variant="outline">
                  เครื่องมือ
                </Button>
              )}
            />
            {!attendanceOnly ? (
              <Button
                className="sm:ml-auto"
                icon={History}
                onClick={() =>
                  void navigate(
                    `/teacher-access/classes/${assignmentId}/history/attendance`,
                  )
                }
              >
                ประวัติการเช็กชื่อ
              </Button>
            ) : null}
          </>
        )}
      </ToolbarControls>

      {!attendanceOnly && tab === "attendance" ? (
        <AttendanceDelegationSection
          delegations={
            attendanceDelegationOptions.isFetching
              ? []
              : (attendanceDelegationOptions.data?.activeDelegations ?? [])
          }
          onClose={async (delegation) => {
            await revokeAttendanceDelegation.mutateAsync({
              grantId: delegation.grantId,
              assignmentId: Number(assignmentId),
            });
          }}
          onShare={(delegation, accessUrl) =>
            setDelegationShare({
              accessUrl: accessUrl ?? delegation.accessUrl,
              description: `${delegation.teacherDisplayName} · ${delegation.assignmentKind === "HOMEROOM" ? "วิชาโฮมรูม" : `${delegation.subjectName ?? "รายวิชา"}${delegation.period ? ` · คาบ ${delegation.period}` : ""}`} · ${date}`,
            })
          }
          onUpdate={async (delegation, input) => {
            return await updateAttendanceDelegation.mutateAsync({
              grantId: delegation.grantId,
              assignmentId: Number(assignmentId),
              ...input,
            });
          }}
          teachers={attendanceDelegationOptions.data?.teachers ?? []}
        />
      ) : null}

      {rosterQuery.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : rosterQuery.isError ? (
        <ErrorState
          description="กรุณาลองโหลดรายชื่อของห้องนี้อีกครั้ง"
          onRetry={() => void rosterQuery.refetch()}
          title="โหลดรายชื่อนักเรียนไม่สำเร็จ"
        />
      ) : visibleRoster.length === 0 ? (
        <EmptyState
          description={
            search || riskTier
              ? "ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ"
              : "ห้องนี้ยังไม่มีนักเรียนที่อยู่ในสถานะใช้งาน"
          }
          icon={STUDENTS_ICON}
          title="ไม่พบรายชื่อนักเรียน"
        />
      ) : tab === "roster" ? (
        <DataTable
          headings={[
            { label: "ลำดับ" },
            { label: "รูปประจำตัว", className: "text-center" },
            { label: "รหัสประจำตัว", sortKey: "studentNumber" },
            { label: "ชื่อ-นามสกุล", sortKey: "name" },
            { label: "หมายเหตุ", sortKey: "comment" },
            {
              label: "สถานะความเสี่ยง",
              sortKey: "status",
              className: "text-center",
            },
            { label: "เครื่องมือ", className: "text-center" },
          ]}
          minWidthClassName="min-w-[1040px]"
          onSortChange={setRosterSort}
          responsive={false}
          sort={rosterSort}
        >
          {visibleRoster.map((student, index) => {
            const fullName = studentDisplayName(student);
            const tier = student.riskTier ?? "NORMAL";
            return (
              <DataTableRow key={student.studentUuid}>
                <DataTableCell className="tabular-nums">
                  {index + 1}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex justify-center">
                    <button
                      aria-label={`เปิดข้อมูลนักเรียน ${fullName}`}
                      className="rounded-full transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() =>
                        void navigate(
                          `/teacher-access/classes/${assignmentId}/students/${student.studentUuid}`,
                        )
                      }
                      type="button"
                    >
                      <TeacherAccessStudentAvatar
                        assignmentId={Number(assignmentId)}
                        student={student}
                      />
                    </button>
                  </div>
                </DataTableCell>
                <DataTableCell className="font-medium tabular-nums">
                  {student.studentNumber ?? "-"}
                </DataTableCell>
                <DataTableCell className="font-medium text-slate-900">
                  {fullName}
                </DataTableCell>
                <DataTableCell className="max-w-[360px]">
                  <StudentCommentCell comment={student.teacherComment} />
                </DataTableCell>
                <DataTableCell>
                  <div className="flex justify-center">
                    <Badge
                      data-student-risk-tier={tier}
                      variant={
                        RISK_TIER_PRESENTATION[tier]?.badge ?? "destructive"
                      }
                    >
                      {RISK_TIER_PRESENTATION[tier]?.label ?? tier}
                    </Badge>
                  </div>
                </DataTableCell>
                <DataTableCell>
                  <div className="flex justify-center gap-2">
                    <IconButton
                      aria-label={`ดูข้อมูล ${fullName}`}
                      icon={UserRound}
                      onClick={() =>
                        void navigate(
                          `/teacher-access/classes/${assignmentId}/students/${student.studentUuid}`,
                        )
                      }
                      variant="edit"
                    />
                    <IconButton
                      aria-label={`เพิ่มความคิดเห็นของ ${fullName}`}
                      icon={MessageSquareText}
                      onClick={() => setCommentStudent(student)}
                      variant="comment"
                    />
                  </div>
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTable>
      ) : (
        <form onSubmit={(event) => void submitAttendance(event)}>
          <div className="mb-4 w-[270px] max-w-full">
            <Label htmlFor="attendance-date">วันที่</Label>
            <DatePicker
              ariaLabel="เลือกวันที่เช็กชื่อ"
              id="attendance-date"
              max={getThaiDateKey()}
              onChange={(value) => {
                setDate(value);
                setTimetableSlotId("");
                setSaved(false);
              }}
              value={date}
            />
          </div>
          {assignment.assignmentKind === "SUBJECT" &&
          !attendanceSlotsQuery.isLoading ? (
            <div className="mb-4 w-full max-w-2xl">
              {hasScheduledSubjectSlot ? (
                <>
                  <Label htmlFor="attendance-period">คาบเรียน</Label>
                  <Select
                    disabled={!requiresPeriodSelection}
                    id="attendance-period"
                    onChange={(event) => {
                      setTimetableSlotId(event.target.value);
                      setSaved(false);
                    }}
                    value={
                      requiresPeriodSelection
                        ? timetableSlotId
                        : String(attendanceSlots[0]?.id ?? "")
                    }
                  >
                    {requiresPeriodSelection ? (
                      <option value="">เลือกคาบเรียน</option>
                    ) : null}
                    {requiresPeriodSelection ? (
                      attendanceSlots.map((slot) => {
                        const scheduledSlot =
                          teacherScheduleQuery.data?.slots.find(
                            (item) => Number(item.id) === slot.id,
                          );
                        const label = scheduledSlot
                          ? `${scheduledSlot.subject_name_th} · คาบ ${scheduledSlot.period} (${getPeriodTimeLabel(
                              teacherScheduleQuery.data?.periodTimes ?? [],
                              scheduledSlot.day_of_week,
                              scheduledSlot.period,
                            )})`
                          : `${assignmentSubjectLabel(assignment)} · คาบ ${slot.period}`;
                        return (
                          <option key={slot.id} value={String(slot.id)}>
                            {label}
                          </option>
                        );
                      })
                    ) : hasScheduledSubjectSlot ? (
                      <option value={String(attendanceSlots[0]?.id ?? "")}>
                        {selectedAttendanceSlotLabel}
                      </option>
                    ) : (
                      <option value="">ไม่มีคาบของวิชานี้ในวันที่เลือก</option>
                    )}
                  </Select>
                </>
              ) : null}
            </div>
          ) : null}
          {isAttendanceDateChanging ? (
            <Skeleton className="h-80 w-full" />
          ) : sessionQuery.isError || attendanceCalendarQuery.isError ? (
            <ErrorState
              description="กรุณาลองตรวจสอบวันเช็กชื่ออีกครั้ง"
              onRetry={() => {
                void sessionQuery.refetch();
                void attendanceCalendarQuery.refetch();
              }}
              title="ตรวจสอบรอบเช็กชื่อไม่สำเร็จ"
            />
          ) : !canRecordOnSelectedDate || !hasScheduledSubjectSlot ? (
            <EmptyState
              description={
                !canRecordOnSelectedDate
                  ? "เลือกวันเรียนตามปฏิทินโรงเรียน แล้วจึงเช็กชื่อ"
                  : "เลือกวันที่ที่มีคาบสอนของวิชานี้ แล้วจึงเช็กชื่อ"
              }
              icon={CLASSROOM_ICON}
              title={
                !canRecordOnSelectedDate
                  ? "วันที่เลือกไม่ใช่วันเรียน"
                  : "ไม่พบคาบเรียนในวันที่เลือก"
              }
            />
          ) : (
            <>
              {/* The delegated link only checks a round in; who submitted it and at
              which revision is the school's business, not the delegate's. */}
              {session?.status === "SUBMITTED" && !attendanceOnly ? (
                <Alert className="mb-4">
                  <AlertTitle>ส่งการเช็กชื่อแล้ว</AlertTitle>
                  <AlertDescription>
                    Revision {session.revision} · บันทึกแล้ว{" "}
                    {session.recordedCount} คน —
                    ต้องติดต่อเจ้าหน้าที่โรงเรียนเพื่อเปิดแก้ไข
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="mb-4">
                <AttendanceCountBadges
                  catalog={attendanceStatusCatalog}
                  counts={counts}
                />
              </div>
              <AttendanceMarkToolbar
                autosaveState={marks.autosaveState}
                canUndo={marks.canUndo}
                failureMessage={marks.failureMessage}
                disabled={!canEditAttendance}
                lastSavedAt={marks.lastSavedAt}
                markedCount={marks.markedCount}
                onMarkRemainingPresent={marks.markRemainingPresent}
                onRetrySave={() => void marks.flush()}
                onUndo={marks.undo}
                totalCount={roster.length}
                unmarkedCount={marks.unmarkedCount}
              />
              <AttendanceRosterTable
                catalog={attendanceStatusCatalog}
                disabled={!canEditAttendance}
                onSortChange={setAttendanceSort}
                onStatusChange={(studentId, status) => {
                  marks.setStatus(studentId, status);
                  setSaved(false);
                }}
                rows={visibleAttendanceRoster.map((student) => ({
                  id: student.studentUuid,
                  name: studentDisplayName(student),
                  studentNumber: student.studentNumber,
                  avatar: (
                    <button
                      aria-label={`เปิดข้อมูลนักเรียน ${studentDisplayName(student)}`}
                      className="rounded-full transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() =>
                        void contextualNavigate(
                          `/teacher-access/classes/${assignmentId}/students/${student.studentUuid}`,
                        )
                      }
                      type="button"
                    >
                      <TeacherAccessStudentAvatar
                        assignmentId={Number(assignmentId)}
                        student={student}
                      />
                    </button>
                  ),
                }))}
                selections={Object.fromEntries(
                  Object.entries(marks.marks).map(([studentId, mark]) => [
                    studentId,
                    mark.status,
                  ]),
                )}
                sort={attendanceSort}
              />

              <div className="mt-4 space-y-3">
                <FormErrorAlert
                  error={saveAttendance.error}
                  fallback="ไม่สามารถบันทึกการเช็กชื่อได้"
                />
                {saved ? (
                  <Alert variant="success">
                    <AlertTitle className="flex items-center gap-2">
                      <CheckCircle2 aria-hidden="true" className="size-4" />
                      บันทึกเรียบร้อย
                    </AlertTitle>
                    <AlertDescription>
                      ส่งการเช็กชื่อของนักเรียน {roster.length} คนแล้ว
                    </AlertDescription>
                  </Alert>
                ) : null}
                <div className="mt-4 flex flex-col items-end gap-1">
                  <Button
                    disabled={
                      attendanceSlotsQuery.isLoading ||
                      !hasScheduledSubjectSlot ||
                      !canEditAttendance ||
                      marks.unmarkedCount > 0 ||
                      (requiresPeriodSelection && !selectedTimetableSlotId)
                    }
                    isLoading={saveAttendance.isPending}
                    loadingText="กำลังส่ง"
                    type="submit"
                  >
                    ส่งเช็กชื่อ {roster.length} คน
                  </Button>
                  {marks.unmarkedCount > 0 ? (
                    <p className="text-sm text-content-secondary">
                      เหลืออีก {marks.unmarkedCount} คนที่ยังไม่เช็ก
                    </p>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </form>
      )}

      {confirmDialog}
      <AttendanceImportDialog
        catalog={attendanceStatusCatalog}
        classLabel={`${assignment.gradeLabel}-${assignment.roomCode}-${date}`}
        contextLabel={[
          formatThaiDate(date),
          assignment.assignmentKind === "SUBJECT" && assignment.subjectName
            ? assignment.subjectName
            : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        disabled={!canEditAttendance}
        onMark={(studentId, status) => {
          marks.markStatus(studentId, status);
          setSaved(false);
        }}
        onOpenChange={setImportOpen}
        open={importOpen}
        parseSheet={(input) =>
          teacherAccessService.parseAttendanceImport(credential, {
            assignmentId: Number(assignmentId),
            ...input,
          })
        }
        rows={importRoster.map((student) => ({
          id: student.studentUuid,
          name: studentDisplayName(student),
          studentNumber: student.studentNumber,
        }))}
        selections={Object.fromEntries(
          Object.entries(marks.marks).map(([studentId, mark]) => [
            studentId,
            mark.status,
          ]),
        )}
      />
      <AttendanceQrScannerDialog
        catalog={attendanceStatusCatalog}
        disabled={!canEditAttendance}
        onMark={(studentId, status) => {
          marks.markStatus(studentId, status);
          setSaved(false);
        }}
        onOpenChange={setQrScannerOpen}
        open={qrScannerOpen}
        rows={roster.map((student) => ({
          id: student.studentUuid,
          name: studentDisplayName(student),
          studentNumber: student.studentNumber,
          avatar: (
            <TeacherAccessStudentAvatar
              assignmentId={Number(assignmentId)}
              student={student}
            />
          ),
        }))}
        selections={Object.fromEntries(
          Object.entries(marks.marks).map(([studentId, mark]) => [
            studentId,
            mark.status,
          ]),
        )}
      />
      {!attendanceOnly && delegationOpen ? (
        <AttendanceDelegationDialog
          classroomId={Number(assignment.classroomId)}
          credential={credential}
          defaultAssignmentId={Number(assignmentId)}
          defaultTimetableSlotId={selectedTimetableSlotId}
          initialAttendanceDate={date}
          onCreated={setDelegationShare}
          onOpenChange={setDelegationOpen}
          open={delegationOpen}
          schoolId={context.schoolId}
          schoolTermId={Number(context.schoolTermId)}
        />
      ) : null}
      <LinkShareDialog
        description={delegationShare?.description}
        link={delegationShare?.accessUrl ?? ""}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDelegationShare(null);
        }}
        open={Boolean(delegationShare)}
        title="แชร์ลิงก์เช็กชื่อ"
      />
      <ClassroomStudentCommentDialog
        classroomId={Number(assignment.classroomId)}
        isSubmitting={createComment.isPending}
        onOpenChange={(open) => {
          if (!open) setCommentStudent(null);
        }}
        problemCategories={context.problemCategories}
        student={
          commentStudent
            ? { ...commentStudent, photoUrl: commentPhotoUrl }
            : null
        }
        submitComment={async ({
          studentUuid,
          problemCategory,
          problemDescription,
        }) => {
          await createComment.mutateAsync({
            studentUuid,
            problemCategory,
            problemDescription,
          });
          await rosterQuery.refetch();
        }}
        submitError={createComment.error}
      />

      <ClassroomTableExportDialog
        authorizeExport={async (format, columns) => {
          await recordExport.mutateAsync({
            assignmentId: Number(assignmentId),
            exportScope: "ROSTER",
            format,
            columns,
          });
        }}
        columns={ROSTER_EXPORT_COLUMNS}
        fileName={`roster-${classroomLabel.replace("/", "-")}`}
        loadRows={() =>
          Promise.resolve(
            visibleRoster.map((student, index) => ({
              order: String(index + 1),
              studentNumber: student.studentNumber ?? "-",
              name: studentDisplayName(student),
              comment: student.teacherComment?.trim() || "-",
              status:
                RISK_TIER_PRESENTATION[student.riskTier ?? "NORMAL"]?.label ??
                "-",
            })),
          )
        }
        onOpenChange={setExportOpen}
        open={exportOpen}
        title={`รายชื่อนักเรียน ห้อง ${classroomLabel}`}
      />
    </TeacherLinkShell>
  );
}
