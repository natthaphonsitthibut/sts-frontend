import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Download,
  History,
  LockOpen,
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
  IconButton,
  DatePicker,
  DropdownMenu,
  Label,
  Select,
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
  PageShell,
  PageToolbar,
  SearchInput,
  SkeletonTable,
  ToolbarControls,
  ToolbarFilterGrid,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { useQuery } from "@tanstack/react-query";
import { AttendanceDelegationHistoryTable } from "../components/AttendanceDelegationHistoryTable";
import { AttendanceImportHistoryTable } from "../components/AttendanceImportHistoryTable";
import {
  listAttendanceImports,
  openAttendanceImportFile,
  recordAttendanceImport,
} from "../api/attendance.service";
import { ClassroomAttendanceHistory } from "../../school-structure/components/ClassroomAttendanceHistory";
import { ClassroomRosterExportDialog } from "../../school-structure/components/ClassroomRosterExportDialog";
import { AttendanceMarkToolbar } from "../components/AttendanceMarkToolbar";
import { AttendanceCountBadges } from "../components/AttendanceCountBadges";
import { AttendanceImportDialog } from "../components/AttendanceImportDialog";
import { AttendanceQrScannerDialog } from "../components/AttendanceQrScannerDialog";
import { attendanceService } from "../api/attendance.service";
import { formatThaiDate } from "../../../lib/date-time";
import { AttendanceRosterTable } from "../components/AttendanceRosterTable";
import { SchoolClassRoomFilter } from "../components/SchoolClassRoomFilter";
import { getAttendanceSaveConfirm } from "../lib/attendance-save-confirm";
import { getIsoDayOfWeekFromDateString } from "../lib/attendance-presentation";
import type { AttendanceStudent } from "../types/attendance.types";
import { formatStudentRoom } from "../../students/lib/student-presentation";
import { AttendanceReopenDialog } from "../components/AttendanceReopenDialog";
import { getApiErrorMessage } from "../../../lib/api-error";
import {
  getTodayIso,
  useAttendanceCheckInForSession,
} from "../hooks/useAttendanceCheckIn";
import { DEFAULT_PAGE_SIZE } from "../../../lib/pagination";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import {
  usePeriodTimes,
  useTimetableSlots,
} from "../../timetable/hooks/useTimetable";
import { getPeriodTimeLabel } from "../../timetable/lib/period-times";
import type {
  SchoolPeriodTime,
  TimetableSlot,
} from "../../timetable/types/timetable.types";
import { StudentAvatar } from "../../students/components/StudentAvatar";
import { StudentCommentCell } from "../../students/components/StudentCommentCell";
import {
  RISK_TIER_ORDER,
  RISK_TIER_PRESENTATION,
} from "../../students/lib/risk-tier-presentation";
import { ClassroomStudentCommentDialog } from "../../school-structure/components/ClassroomStudentCommentDialog";
import { useCreateClassroomStudentComment } from "../../school-structure/hooks/useSchoolStructure";
import { LinkShareDialog } from "../../../components/layout/link-share-dialog";
import { AttendanceDelegationDialog } from "../components/AttendanceDelegationDialog";
import { AttendanceDelegationSection } from "../components/AttendanceDelegationSection";
import { AttendanceDelegationEditDialog } from "../components/AttendanceDelegationEditDialog";
import type { TeacherAttendanceDelegationHistoryEntry } from "../../teacher-access/types/teacher-access.types";
import {
  useRevokeTeacherAttendanceDelegation,
  useStaffAttendanceDelegationHistory,
  useTeacherAttendanceDelegationOptions,
  useUpdateTeacherAttendanceDelegation,
} from "../../teacher-access/hooks/useTeacherAccess";

function rosterSortValue(student: AttendanceStudent, key: string): string {
  if (key === "studentNumber") return student.student_number ?? "";
  if (key === "comment") return student.teacher_comment ?? "";
  if (key === "status") {
    return RISK_TIER_PRESENTATION[student.risk_tier ?? "NORMAL"]?.label ?? "";
  }
  return student.name;
}

function sortAttendanceStudents(
  students: readonly AttendanceStudent[],
  sort: DataTableSortState | undefined,
): AttendanceStudent[] {
  if (!sort) return [...students];
  return [...students].sort((left, right) => {
    const result = rosterSortValue(left, sort.key).localeCompare(
      rosterSortValue(right, sort.key),
      "th",
    );
    return sort.direction === "asc" ? result : -result;
  });
}

function timeToMinutes(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

// Sort key for a slot with no bell-schedule time: past every real
// minute-of-day value (max 1439), so untimed slots order after timed ones
// while still sorting among themselves by period number.
const UNTIMED_SLOT_SORT_BASE = 10_000;

function slotSortKey(row: {
  startsAt: number | null;
  slot: TimetableSlot;
}): number {
  return row.startsAt ?? UNTIMED_SLOT_SORT_BASE + row.slot.period;
}

function findDefaultSlot(
  slots: TimetableSlot[],
  periodTimes: SchoolPeriodTime[],
): TimetableSlot | null {
  if (slots.length === 0) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const withTimes = slots
    .map((slot) => {
      const periodTime = periodTimes.find(
        (row) =>
          row.day_of_week === slot.day_of_week && row.period === slot.period,
      );
      return {
        slot,
        startsAt: periodTime ? timeToMinutes(periodTime.starts_at) : null,
        endsAt: periodTime ? timeToMinutes(periodTime.ends_at) : null,
      };
    })
    .sort((left, right) => slotSortKey(left) - slotSortKey(right));

  const current = withTimes.find(
    (row) =>
      row.startsAt !== null &&
      row.endsAt !== null &&
      row.startsAt <= currentMinutes &&
      currentMinutes <= row.endsAt,
  );
  if (current) return current.slot;

  const next = withTimes.find(
    (row) => row.startsAt !== null && row.startsAt > currentMinutes,
  );
  return (next ?? withTimes[0])?.slot ?? null;
}

export function AttendanceCheckInPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const contextualNavigate = useContextualNavigate();
  const attendanceStatusCatalog = useStatusCatalog("ATTENDANCE_RECORD").items;
  const delegationStatusCatalog = useStatusCatalog(
    "ATTENDANCE_DELEGATION",
  ).items;
  const [routeTab, setTab] = useRouteTab(
    {
      roster: "/attendance/roster",
      attendance: "/attendance/check-in",
    } as const,
    "roster",
  );
  const [historyTab, setHistoryTab] = useRouteTab(
    {
      attendance: "/attendance/history/attendance",
      imports: "/attendance/history/imports",
      delegations: "/attendance/history/delegations",
    } as const,
    "attendance",
  );
  // History is the same page's third branch, split into the three views the
  // teacher link already uses.
  const isHistoryRoute = useLocation().pathname.startsWith(
    "/attendance/history",
  );
  const tab = isHistoryRoute ? "history" : routeTab;
  const [exportOpen, setExportOpen] = useState(false);
  const [riskTier, setRiskTier] = useState("");
  const [delegationPage, setDelegationPage] = useState(1);
  const [delegationRowsPerPage, setDelegationRowsPerPage] =
    useState<number>(DEFAULT_PAGE_SIZE);
  const [delegationSort, setDelegationSort] = useState<
    DataTableSortState | undefined
  >({ key: "date", direction: "desc" });
  // One subject choice for all three history tabs: เช็กชื่อ, นำเข้าไฟล์ and
  // มอบหมาย answer about the same round, so they filter together.
  const [historySubjectId, setHistorySubjectId] = useState("");
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  // The success banner stays until it is closed or the next round is sent, so a
  // teacher who scrolled away still sees that the last submit went through.
  const [saveNoticeDismissed, setSaveNoticeDismissed] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [delegationOpen, setDelegationOpen] = useState(false);
  const [delegationShare, setDelegationShare] = useState<{
    accessUrl: string;
    description: string;
  } | null>(null);
  const [delegationEdit, setDelegationEdit] =
    useState<TeacherAttendanceDelegationHistoryEntry | null>(null);
  const [commentStudent, setCommentStudent] =
    useState<AttendanceStudent | null>(null);
  const createClassroomComment = useCreateClassroomStudentComment();
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceSort, setAttendanceSort] = useState<
    DataTableSortState | undefined
  >({
    key: "studentNumber",
    direction: "asc",
  });
  const [rosterSort, setRosterSort] = useState<DataTableSortState | undefined>({
    key: "studentNumber",
    direction: "asc",
  });
  const [selectedSlotId, setSelectedSlotId] = useState("");
  // Defaults to today but stays editable — lets a teacher check in for an
  // earlier date (e.g. catching up after the fact). Never a future date; the
  // backend rejects that too.
  const [checkInDate, setCheckInDate] = useState(getTodayIso());
  const isCheckInDateToday = checkInDate === getTodayIso();
  const selectedSlotIdNumber = selectedSlotId ? Number(selectedSlotId) : null;
  const checkIn = useAttendanceCheckInForSession({
    // The roster tab is a class directory, so it must load as soon as the
    // classroom filter is complete. Only the check-in tab needs a timetable
    // slot before opening an attendance session.
    enabled: tab !== "attendance" || Boolean(selectedSlotIdNumber),
    timetableSlotId: selectedSlotIdNumber,
    date: checkInDate,
  });
  const { confirm, dialog: confirmDialog } = useConfirm();

  const {
    scope,
    gradeLevels,
    rooms,
    schoolId,
    grade,
    room,
    setSchoolId,
    setGrade,
    setRoom,
    students,
    selections,
    setStatus,
    markStatus,
    counts,
    canLoadRoster,
    isRosterLoading,
    isRosterError,
    refetchRoster,
    save,
    saveState,
    markRemainingPresent,
    undoSelections,
    canUndoSelections,
    unmarkedCount,
    markedCount,
    autosaveState,
    autosaveFailureMessage,
    lastSavedAt,
    flushMarks,
    sessionContext,
    isSessionLoading,
    isSessionError,
    canEditAttendance,
    reopen,
    reopenState,
    schoolArea,
  } = checkIn;
  // The roster carries the classroom the filter resolved to, which is what the
  // shared export dialog and the history table are keyed by.
  const rosterClassroomId = Number(students[0]?.classroom_id) || null;
  const rosterClassroomLabel = `${grade}/${formatStudentRoom(room)}`;
  const selectedGradeLevel = gradeLevels.find((level) => level.label === grade);
  const selectedRoomNo = Number(room);
  const timetableFilter =
    schoolId &&
    selectedGradeLevel &&
    room !== "" &&
    Number.isInteger(selectedRoomNo) &&
    selectedRoomNo > 0
      ? {
          schoolId: Number(schoolId),
          gradeLevelId: selectedGradeLevel.id,
          roomNo: selectedRoomNo,
        }
      : null;
  const slotsQuery = useTimetableSlots(timetableFilter);
  const periodTimesQuery = usePeriodTimes(schoolId ? Number(schoolId) : null);
  // Slots for whichever date is picked above (defaults to today, but a
  // teacher can switch to an earlier date to catch up on check-in).
  const slotsForDate = useMemo(
    () =>
      (slotsQuery.data?.data ?? [])
        .filter(
          (slot) =>
            slot.day_of_week === getIsoDayOfWeekFromDateString(checkInDate),
        )
        .sort((left, right) => left.period - right.period),
    [slotsQuery.data?.data, checkInDate],
  );
  const subjectSlotOptions = useMemo(
    () => [
      {
        value: "",
        label:
          slotsForDate.length > 0 ? "เลือกคาบรายวิชา" : "ไม่พบคาบวันที่เลือก",
      },
      ...slotsForDate.map((slot) => ({
        value: String(slot.id),
        label: `${slot.subject_name_th} · คาบ ${slot.period} (${getPeriodTimeLabel(
          periodTimesQuery.data?.data ?? [],
          slot.day_of_week,
          slot.period,
        )})`,
      })),
    ],
    [periodTimesQuery.data?.data, slotsForDate],
  );
  // The room's subjects, from the timetable this page already loads for the
  // period picker — so the history can be narrowed to one subject.
  const delegationHistoryQuery = useStaffAttendanceDelegationHistory(
    {
      schoolId: schoolId ? Number(schoolId) : undefined,
      classroomId: rosterClassroomId,
      subjectId: historySubjectId ? Number(historySubjectId) : undefined,
      page: delegationPage,
      limit: delegationRowsPerPage,
      search: attendanceSearch.trim() || undefined,
      sortBy: delegationSort?.key as
        | "date"
        | "issuedBy"
        | "teacher"
        | "status"
        | undefined,
      sortDirection: delegationSort?.direction,
    },
    isHistoryRoute && historyTab === "delegations",
  );
  const importHistoryQuery = useQuery({
    queryKey: [
      "attendance-imports",
      rosterClassroomId,
      historySubjectId,
      delegationPage,
      delegationRowsPerPage,
      attendanceSearch,
    ],
    queryFn: () =>
      listAttendanceImports({
        classroomId: rosterClassroomId!,
        subjectId: historySubjectId ? Number(historySubjectId) : undefined,
        page: delegationPage,
        limit: delegationRowsPerPage,
        search: attendanceSearch.trim() || undefined,
      }),
    enabled: Boolean(
      rosterClassroomId && isHistoryRoute && historyTab === "imports",
    ),
  });

  /** Streams the stored file back and hands it to the browser to open. */
  async function openImportFile(entry: {
    id: string;
    fileName: string;
    hasFile: boolean;
    sourceUrl: string | null;
  }): Promise<void> {
    if (!entry.hasFile) {
      if (entry.sourceUrl) window.open(entry.sourceUrl, "_blank", "noopener");
      return;
    }
    if (!rosterClassroomId) return;
    const blob = await openAttendanceImportFile(entry.id, rosterClassroomId);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = entry.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const roomSubjects = useMemo(() => {
    const seen = new Map<number, string>();
    for (const slot of slotsQuery.data?.data ?? []) {
      if (slot.subject_id && !seen.has(slot.subject_id)) {
        seen.set(slot.subject_id, slot.subject_name_th);
      }
    }
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [slotsQuery.data?.data]);
  const selectedTimetableSlot = slotsForDate.find(
    (slot) => String(slot.id) === selectedSlotId,
  );
  const attendanceDelegationOptions = useTeacherAttendanceDelegationOptions({
    schoolId: selectedTimetableSlot?.school_id,
    schoolTermId: selectedTimetableSlot
      ? Number(selectedTimetableSlot.school_term_id)
      : undefined,
    classroomId: selectedTimetableSlot
      ? Number(selectedTimetableSlot.classroom_id)
      : undefined,
    attendanceDate: checkInDate,
    enabled: Boolean(selectedTimetableSlot && tab === "attendance"),
  });
  // Editing a row from ประวัติ needs the teacher list for that row's own day,
  // which is not necessarily the day the check-in screen is showing.
  const delegationEditOptions = useTeacherAttendanceDelegationOptions({
    schoolId: schoolId ? Number(schoolId) : undefined,
    schoolTermId: selectedTimetableSlot
      ? Number(selectedTimetableSlot.school_term_id)
      : undefined,
    classroomId: rosterClassroomId ?? undefined,
    attendanceDate: delegationEdit?.attendanceDate,
    enabled: Boolean(delegationEdit),
  });
  const updateAttendanceDelegation = useUpdateTeacherAttendanceDelegation();
  const revokeAttendanceDelegation = useRevokeTeacherAttendanceDelegation();

  // Adjust stale state while rendering so async timetable changes resolve
  // before commit without an effect/render cascade. A valid user selection is
  // never replaced.
  if (!slotsForDate.some((slot) => String(slot.id) === selectedSlotId)) {
    const defaultSlot = isCheckInDateToday
      ? findDefaultSlot(slotsForDate, periodTimesQuery.data?.data ?? [])
      : null;
    const defaultSlotId = defaultSlot ? String(defaultSlot.id) : "";
    if (defaultSlotId !== selectedSlotId) setSelectedSlotId(defaultSlotId);
  }

  const newCases = saveState.data?.newCases ?? [];
  const filterScope = useMemo(
    () => ({
      grade,
      gradeLevels,
      gradeLocked: scope.isGradeLocked,
      room,
      roomLocked: scope.isRoomLocked,
      rooms,
      schoolId,
      schoolLocked: scope.isSchoolLocked,
    }),
    [
      grade,
      gradeLevels,
      room,
      rooms,
      schoolId,
      scope.isGradeLocked,
      scope.isRoomLocked,
      scope.isSchoolLocked,
    ],
  );

  async function handleSave(): Promise<void> {
    if (
      !students.length ||
      saveState.isPending ||
      !canEditAttendance ||
      unmarkedCount > 0
    ) {
      return;
    }

    const confirmed = await confirm(getAttendanceSaveConfirm(counts));
    if (!confirmed) {
      return;
    }

    setSaveNoticeDismissed(false);
    try {
      await save();
    } catch {
      // The mutation state renders the actionable API error below the form.
      // Catch here so a failed request does not become an unhandled promise.
    }
  }

  /** Closing a link from the history is the same action the active list runs. */
  async function revokeDelegationFromHistory(
    entry: TeacherAttendanceDelegationHistoryEntry,
  ): Promise<void> {
    const accepted = await confirm({
      title: "ยกเลิกลิงก์มอบหมายการเช็กชื่อ",
      description: `ลิงก์ของ ${entry.teacherDisplayName} จะใช้งานไม่ได้ทันที`,
      confirmText: "ยกเลิกลิงก์",
      variant: "destructive",
    });
    if (!accepted) return;
    await revokeAttendanceDelegation.mutateAsync({ grantId: entry.grantId });
    await delegationHistoryQuery.refetch();
  }

  async function handleReopen(reason: string): Promise<void> {
    await reopen(reason);
    setReopenDialogOpen(false);
  }

  function handleSchoolChange(value: string): void {
    setSelectedSlotId("");
    setSchoolId(value);
  }

  function handleGradeChange(value: string): void {
    setSelectedSlotId("");
    setGrade(value);
  }

  function handleRoomChange(value: string): void {
    setSelectedSlotId("");
    setRoom(value);
  }

  function handleCheckInDateChange(value: string): void {
    setSelectedSlotId("");
    setCheckInDate(value);
  }

  const filteredStudents = useMemo(() => {
    const keyword = attendanceSearch.trim().toLocaleLowerCase("th-TH");
    return students.filter((student) => {
      const matchesKeyword =
        !keyword ||
        `${student.name} ${student.student_number ?? ""}`
          .toLocaleLowerCase("th-TH")
          .includes(keyword);
      const matchesTier =
        !riskTier || (student.risk_tier ?? "NORMAL") === riskTier;
      return matchesKeyword && matchesTier;
    });
  }, [attendanceSearch, riskTier, students]);

  const visibleStudents = useMemo(
    () => sortAttendanceStudents(filteredStudents, attendanceSort),
    [attendanceSort, filteredStudents],
  );
  const visibleRosterStudents = useMemo(
    () => sortAttendanceStudents(filteredStudents, rosterSort),
    [filteredStudents, rosterSort],
  );

  return (
    <PageShell className="pb-6">
      <PageToolbar
        icon={ClipboardCheck}
        // History is a page of its own inside this one, so it needs the way back
        // that the teacher link's history has.
        navigation={
          isHistoryRoute ? (
            <NavButton
              icon={ArrowLeft}
              to="/attendance/check-in"
              variant="outline"
            >
              ย้อนกลับ
            </NavButton>
          ) : undefined
        }
        title="เช็กชื่อ"
        description="บันทึกการมาเรียนประจำวันของนักเรียนในแต่ละห้อง"
      >
        <ToolbarFilterGrid>
          <SchoolClassRoomFilter
            area={schoolArea}
            emptyOptionLabels={{
              grade: "เลือกชั้น",
              room: "เลือกห้อง",
              school: "เลือกโรงเรียน",
            }}
            onGradeChange={handleGradeChange}
            onRoomChange={handleRoomChange}
            onSchoolChange={handleSchoolChange}
            schoolSelector="scope-combobox"
            scope={filterScope}
          />
        </ToolbarFilterGrid>
      </PageToolbar>

      {tab !== "history" ? (
        <div className="mb-6">
          <Tabs
            aria-label="ข้อมูลห้องเรียน"
            className="flex w-full"
            onChange={setTab}
            options={[
              { value: "roster", label: "รายชื่อ" },
              { value: "attendance", label: "เช็กชื่อ" },
            ]}
            value={tab}
          />
        </div>
      ) : null}

      {tab !== "history" ? (
        <ToolbarControls className="mb-5">
          <SearchInput
            className="sm:max-w-[560px]"
            onChange={setAttendanceSearch}
            placeholder="ค้นหา"
            value={attendanceSearch}
          />
          {tab === "attendance" ? (
            // Grouped so the two secondary tools sit side by side and share
            // width equally on mobile; `sm:contents` drops the wrapper at the
            // desktop breakpoint so the original auto-width + ml-auto layout
            // there is untouched.
            <div className="flex items-center gap-2 sm:contents">
              <DropdownMenu
                align="start"
                ariaLabel="เครื่องมือการเช็กชื่อ"
                className="flex-1 sm:flex-none"
                items={[
                  {
                    id: "qr",
                    label: "สแกน QR Code เพื่อเช็กชื่อ",
                    // Every tool writes into the round, so they follow the round:
                    // usable while it is open, off once it has been submitted
                    // until someone reopens it.
                    disabled:
                      !canEditAttendance ||
                      !canLoadRoster ||
                      isRosterLoading ||
                      students.length === 0,
                    onSelect: () => setQrScannerOpen(true),
                  },
                  {
                    id: "delegate",
                    label: "มอบหมายการเช็กชื่อ",
                    disabled:
                      !canEditAttendance ||
                      !canLoadRoster ||
                      !selectedTimetableSlot ||
                      attendanceDelegationOptions.isFetching ||
                      attendanceDelegationOptions.isError ||
                      !attendanceDelegationOptions.data?.assignments.length,
                    onSelect: () => setDelegationOpen(true),
                  },
                  {
                    id: "import",
                    label: "นำเข้าไฟล์การเช็กชื่อ",
                    disabled:
                      !canEditAttendance ||
                      !canLoadRoster ||
                      isRosterLoading ||
                      students.length === 0,
                    onSelect: () => setImportOpen(true),
                  },
                ]}
                trigger={(triggerProps) => (
                  <Button
                    {...triggerProps}
                    className="w-full sm:w-auto"
                    icon={Wrench}
                    variant="outline"
                  >
                    เครื่องมือ
                  </Button>
                )}
              />
              <Button
                className="flex-1 sm:flex-none sm:ml-auto"
                icon={History}
                // Straight to the tab: bouncing through the redirect route would
                // unmount this page and drop the school/grade/room already picked.
                onClick={() => void navigate("/attendance/history/attendance")}
              >
                ประวัติการเช็กชื่อ
              </Button>
            </div>
          ) : (
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
              {can("export-data") ? (
                <Button
                  className="sm:ml-auto"
                  disabled={
                    !rosterClassroomId || visibleRosterStudents.length === 0
                  }
                  icon={Download}
                  onClick={() => setExportOpen(true)}
                >
                  ดาวน์โหลดข้อมูล
                </Button>
              ) : null}
            </>
          )}
        </ToolbarControls>
      ) : null}

      {tab === "roster" ? (
        <div className="space-y-4">
          {!canLoadRoster ? (
            <EmptyState
              icon={ClipboardList}
              title="เลือกห้องเรียนก่อนดูรายชื่อ"
              description="กรุณาเลือกโรงเรียน ระดับชั้น และห้อง"
            />
          ) : isRosterError ? (
            <ErrorState
              title="ไม่สามารถโหลดรายชื่อนักเรียนได้"
              onRetry={() => void refetchRoster()}
            />
          ) : isRosterLoading ? (
            <SkeletonTable rows={8} />
          ) : students.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="ไม่พบรายชื่อนักเรียนในห้องนี้"
              description="ลองเลือกชั้นหรือห้องอื่น"
            />
          ) : visibleRosterStudents.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="ไม่พบรายชื่อนักเรียน"
              description="ลองเปลี่ยนคำค้นหา"
            />
          ) : (
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
              {visibleRosterStudents.map((student, index) => (
                <DataTableRow key={student.id}>
                  <DataTableCell className="tabular-nums">
                    {index + 1}
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex justify-center">
                      <button
                        aria-label={`เปิดข้อมูลนักเรียน ${student.name}`}
                        className="rounded-full transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        onClick={() =>
                          void contextualNavigate(`/students/${student.id}`)
                        }
                        type="button"
                      >
                        <StudentAvatar
                          name={student.name}
                          photoUrl={student.photo_url}
                        />
                      </button>
                    </div>
                  </DataTableCell>
                  <DataTableCell className="font-medium tabular-nums">
                    {student.student_number ?? "-"}
                  </DataTableCell>
                  <DataTableCell className="font-medium text-slate-900">
                    {student.name}
                  </DataTableCell>
                  <DataTableCell className="max-w-[360px]">
                    <StudentCommentCell comment={student.teacher_comment} />
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex justify-center">
                      {(() => {
                        const tier = student.risk_tier ?? "NORMAL";
                        return (
                          <Badge
                            data-student-risk-tier={tier}
                            variant={
                              RISK_TIER_PRESENTATION[tier]?.badge ??
                              "destructive"
                            }
                          >
                            {RISK_TIER_PRESENTATION[tier]?.label ?? tier}
                          </Badge>
                        );
                      })()}
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex justify-center gap-2">
                      <IconButton
                        aria-label={`ดูข้อมูล ${student.name}`}
                        icon={UserRound}
                        onClick={() =>
                          void contextualNavigate(`/students/${student.id}`)
                        }
                        variant="edit"
                      />
                      <IconButton
                        aria-label={`เพิ่มความคิดเห็นของ ${student.name}`}
                        icon={MessageSquareText}
                        onClick={() => setCommentStudent(student)}
                        variant="comment"
                      />
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTable>
          )}
        </div>
      ) : tab === "attendance" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <div className="mb-4 w-full sm:max-w-[560px]">
            <Label htmlFor="attendance-date">วันที่</Label>
            <DatePicker
              ariaLabel="เลือกวันที่เช็กชื่อ"
              id="attendance-date"
              max={getTodayIso()}
              value={checkInDate}
              onChange={(next) =>
                handleCheckInDateChange(next || getTodayIso())
              }
            />
          </div>
          {/* Same width cap as the search bar and the date field above it. */}
          <div className="mb-4 w-full sm:max-w-[560px]">
            <Label htmlFor="attendance-period">คาบเรียน</Label>
            <Select
              disabled={
                !timetableFilter ||
                slotsQuery.isLoading ||
                slotsForDate.length === 0
              }
              id="attendance-period"
              onChange={(event) => setSelectedSlotId(event.target.value)}
              value={selectedSlotId}
            >
              {subjectSlotOptions.map((option) => (
                <option key={option.value || "empty"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <AttendanceDelegationSection
            delegations={
              attendanceDelegationOptions.isFetching
                ? []
                : (attendanceDelegationOptions.data?.activeDelegations ?? [])
            }
            onClose={async (delegation) => {
              await revokeAttendanceDelegation.mutateAsync({
                grantId: delegation.grantId,
              });
            }}
            onShare={(delegation, accessUrl) =>
              setDelegationShare({
                accessUrl: accessUrl ?? delegation.accessUrl,
                description: `${delegation.teacherDisplayName} · ${delegation.assignmentKind === "HOMEROOM" ? "วิชาโฮมรูม" : `${delegation.subjectName ?? "รายวิชา"}${delegation.period ? ` · คาบ ${delegation.period}` : ""}`} · ${checkInDate}`,
              })
            }
            onUpdate={async (delegation, input) => {
              if (!selectedTimetableSlot) return;
              return await updateAttendanceDelegation.mutateAsync({
                grantId: delegation.grantId,
                schoolId: selectedTimetableSlot.school_id,
                ...input,
              });
            }}
            teachers={attendanceDelegationOptions.data?.teachers ?? []}
          />

          {saveState.isError ? (
            <div className="mb-4">
              <Alert variant="destructive">
                <AlertTitle>บันทึกไม่สำเร็จ</AlertTitle>
                <AlertDescription>
                  {getApiErrorMessage(
                    saveState.error,
                    "เกิดข้อผิดพลาดระหว่างบันทึกการเช็กชื่อ กรุณาลองอีกครั้ง",
                  )}
                </AlertDescription>
              </Alert>
            </div>
          ) : saveState.isSuccess && !saveNoticeDismissed ? (
            <div className="mb-4">
              <Alert
                onDismiss={() => setSaveNoticeDismissed(true)}
                variant="success"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2
                    className="mt-0.5 size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <AlertTitle>ส่งการเช็กชื่อเรียบร้อยแล้ว</AlertTitle>
                    {newCases.length > 0 ? (
                      <AlertDescription className="max-h-16 overflow-auto">
                        ระบบสร้างเคสติดตามอัตโนมัติ {newCases.length} รายการ:{" "}
                        {newCases.map((item) => item.student_name).join(", ")}
                      </AlertDescription>
                    ) : null}
                  </div>
                </div>
              </Alert>
            </div>
          ) : null}

          {canLoadRoster &&
          sessionContext &&
          !sessionContext.calendarConfigured ? (
            <div className="mb-4">
              <Alert variant="warning">
                <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
                <div>
                  <AlertTitle>ยังไม่ได้เปิดปฏิทินภาคเรียน</AlertTitle>
                  <AlertDescription>
                    บันทึกได้ แต่ระบบจะยังไม่สร้างเคสขาดเรียนอัตโนมัติจากรอบนี้
                  </AlertDescription>
                </div>
              </Alert>
            </div>
          ) : null}

          {sessionContext?.session?.status === "SUBMITTED" ? (
            <div className="mb-4">
              <Alert>
                <div className="flex w-full flex-wrap items-center justify-between gap-3">
                  <div>
                    <AlertTitle>ส่งการเช็กชื่อแล้ว</AlertTitle>
                    <AlertDescription>
                      Revision {sessionContext.session.revision} · บันทึกแล้ว{" "}
                      {sessionContext.session.recordedCount} คน
                    </AlertDescription>
                  </div>
                  <Button
                    icon={LockOpen}
                    onClick={() => setReopenDialogOpen(true)}
                    size="sm"
                    variant="outline"
                  >
                    เปิดแก้ไข
                  </Button>
                </div>
              </Alert>
            </div>
          ) : null}

          {isSessionError ? (
            <div className="mb-4">
              <Alert variant="destructive">
                <AlertTitle>ตรวจสอบรอบเช็กชื่อไม่สำเร็จ</AlertTitle>
                <AlertDescription>
                  กรุณาโหลดหน้าใหม่ก่อนบันทึกข้อมูล
                </AlertDescription>
              </Alert>
            </div>
          ) : null}

          <div className="space-y-4">
            {!canLoadRoster ? (
              <EmptyState
                icon={ClipboardList}
                title="เลือกคาบรายวิชาก่อนเช็กชื่อ"
                description="กรุณาเลือกโรงเรียน ระดับชั้น ห้อง และคาบรายวิชาของวันที่เลือก"
              />
            ) : isRosterError ? (
              <ErrorState
                title="ไม่สามารถโหลดรายชื่อนักเรียนได้"
                onRetry={() => void refetchRoster()}
              />
            ) : isRosterLoading || isSessionLoading ? (
              <SkeletonTable rows={8} />
            ) : students.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="ไม่พบรายชื่อนักเรียนในห้องนี้"
                description="ลองเลือกชั้นหรือห้องอื่น"
              />
            ) : visibleStudents.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="ไม่พบรายชื่อนักเรียน"
                description="ลองเปลี่ยนคำค้นหา"
              />
            ) : (
              <>
                <div className="mb-4">
                  <AttendanceCountBadges
                    catalog={attendanceStatusCatalog}
                    counts={counts}
                  />
                </div>
                <AttendanceMarkToolbar
                  autosaveState={autosaveState}
                  canUndo={canUndoSelections}
                  failureMessage={autosaveFailureMessage}
                  disabled={!canEditAttendance || isSessionError}
                  lastSavedAt={lastSavedAt}
                  markedCount={markedCount}
                  onMarkRemainingPresent={markRemainingPresent}
                  onRetrySave={() => void flushMarks()}
                  onUndo={undoSelections}
                  totalCount={students.length}
                  unmarkedCount={unmarkedCount}
                />
                <AttendanceRosterTable
                  catalog={attendanceStatusCatalog}
                  disabled={!canEditAttendance || isSessionError}
                  onSortChange={setAttendanceSort}
                  onStatusChange={setStatus}
                  rows={visibleStudents.map((student) => ({
                    id: student.id,
                    name: student.name,
                    studentNumber: student.student_number,
                    avatar: (
                      <button
                        aria-label={`เปิดข้อมูลนักเรียน ${student.name}`}
                        className="rounded-full transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        onClick={() =>
                          void contextualNavigate(`/students/${student.id}`)
                        }
                        type="button"
                      >
                        <StudentAvatar
                          name={student.name}
                          photoUrl={student.photo_url}
                        />
                      </button>
                    ),
                  }))}
                  selections={selections}
                  sort={attendanceSort}
                />
              </>
            )}

            {canLoadRoster && students.length > 0 && canEditAttendance ? (
              // Sticky so the submit action stays one tap away from anywhere
              // in a long roster, instead of scrolling back to the bottom
              // once the last student is marked.
              <div className="sticky bottom-0 z-10 mt-4 flex flex-col items-end gap-1 border-t border-slate-200 bg-white/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
                <Button
                  disabled={isSessionError || unmarkedCount > 0}
                  isLoading={saveState.isPending}
                  loadingText="กำลังส่ง"
                  type="submit"
                >
                  ส่งเช็กชื่อ {students.length} คน
                </Button>
                {unmarkedCount > 0 ? (
                  <p className="text-sm text-content-secondary">
                    เหลืออีก {unmarkedCount} คนที่ยังไม่เช็ก
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="mb-6">
            <Tabs
              aria-label="ประเภทประวัติ"
              className="flex w-full"
              onChange={setHistoryTab}
              options={[
                { value: "attendance", label: "เช็กชื่อ" },
                { value: "imports", label: "นำเข้าไฟล์" },
                { value: "delegations", label: "มอบหมาย" },
              ]}
              value={historyTab}
            />
          </div>
          {historyTab !== "attendance" && roomSubjects.length > 0 ? (
            <ToolbarControls className="mb-5">
              <FilterSelect
                ariaLabel="กรองรายวิชา"
                onChange={(value) => {
                  setHistorySubjectId(value);
                  setDelegationPage(1);
                }}
                value={historySubjectId}
              >
                <option value="">ทุกรายวิชา</option>
                {roomSubjects.map((subject) => (
                  <option key={subject.id} value={String(subject.id)}>
                    {subject.name}
                  </option>
                ))}
              </FilterSelect>
            </ToolbarControls>
          ) : null}
          {historyTab === "imports" ? (
            <AttendanceImportHistoryTable
              isError={importHistoryQuery.isError}
              onOpenFile={(entry) => void openImportFile(entry)}
              onPageChange={setDelegationPage}
              onRetry={() => void importHistoryQuery.refetch()}
              onRowsPerPageChange={(value) => {
                setDelegationRowsPerPage(value);
                setDelegationPage(1);
              }}
              onSortChange={setDelegationSort}
              page={delegationPage}
              rows={importHistoryQuery.data?.data ?? []}
              rowsPerPage={delegationRowsPerPage}
              sort={delegationSort}
              totalCount={importHistoryQuery.data?.meta.totalCount ?? 0}
            />
          ) : historyTab === "delegations" ? (
            <AttendanceDelegationHistoryTable
              isError={delegationHistoryQuery.isError}
              onEdit={setDelegationEdit}
              onPageChange={setDelegationPage}
              onRevoke={(entry) => void revokeDelegationFromHistory(entry)}
              onRetry={() => void delegationHistoryQuery.refetch()}
              onRowsPerPageChange={(value) => {
                setDelegationRowsPerPage(value);
                setDelegationPage(1);
              }}
              onShare={(entry) =>
                entry.accessUrl
                  ? setDelegationShare({
                      accessUrl: entry.accessUrl,
                      description: `${entry.teacherDisplayName} · ${entry.attendanceDate}`,
                    })
                  : undefined
              }
              onSortChange={setDelegationSort}
              page={delegationPage}
              rows={delegationHistoryQuery.data?.data ?? []}
              rowsPerPage={delegationRowsPerPage}
              sort={delegationSort}
              statuses={delegationStatusCatalog}
              totalCount={delegationHistoryQuery.data?.meta.totalCount ?? 0}
            />
          ) : rosterClassroomId ? (
            /* The same component ห้องเรียนทั้งหมด renders, so both screens answer
               "what happened in this room" with one table and one export. */
            <ClassroomAttendanceHistory
              classroomId={rosterClassroomId}
              onSubjectIdChange={setHistorySubjectId}
              subjectId={historySubjectId}
              classroomLabel={rosterClassroomLabel}
              subjects={roomSubjects}
            />
          ) : (
            <EmptyState
              description="กรุณาเลือกโรงเรียน ระดับชั้น และห้องด้านบนก่อน"
              icon={ClipboardList}
              title="เลือกห้องเรียนก่อนดูประวัติ"
            />
          )}
        </div>
      )}
      {confirmDialog}
      <AttendanceImportDialog
        catalog={attendanceStatusCatalog}
        classLabel={`${grade || "ห้องเรียน"}-${formatStudentRoom(room)}-${checkInDate}`}
        contextLabel={[
          formatThaiDate(checkInDate),
          selectedTimetableSlot
            ? `${selectedTimetableSlot.subject_name_th} · คาบ ${selectedTimetableSlot.period}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        disabled={!canEditAttendance || isSessionError}
        onMark={markStatus}
        onOpenChange={setImportOpen}
        recordImport={async (input) => {
          if (!rosterClassroomId || !selectedTimetableSlot) return;
          await recordAttendanceImport({
            classroomId: rosterClassroomId,
            attendanceDate: checkInDate,
            timetableSlotId: Number(selectedTimetableSlot.id),
            subjectId: selectedTimetableSlot.subject_id ?? undefined,
            ...input,
          });
          await importHistoryQuery.refetch();
        }}
        open={importOpen}
        parseSheet={(input) => attendanceService.parseAttendanceImport(input)}
        rows={students.map((student) => ({
          id: student.id,
          name: student.name,
          studentNumber: student.student_number,
        }))}
        selections={selections}
      />
      <AttendanceQrScannerDialog
        catalog={attendanceStatusCatalog}
        disabled={!canEditAttendance || isSessionError}
        onMark={markStatus}
        onOpenChange={setQrScannerOpen}
        open={qrScannerOpen}
        rows={students.map((student) => ({
          id: student.id,
          name: student.name,
          studentNumber: student.student_number,
          avatar: (
            <StudentAvatar name={student.name} photoUrl={student.photo_url} />
          ),
        }))}
        selections={selections}
      />
      {delegationOpen ? (
        <AttendanceDelegationDialog
          classroomId={
            selectedTimetableSlot
              ? Number(selectedTimetableSlot.classroom_id)
              : undefined
          }
          defaultSubjectId={selectedTimetableSlot?.subject_id}
          defaultTimetableSlotId={
            selectedTimetableSlot ? Number(selectedTimetableSlot.id) : undefined
          }
          initialAttendanceDate={checkInDate}
          onCreated={setDelegationShare}
          onOpenChange={setDelegationOpen}
          open={delegationOpen}
          schoolId={selectedTimetableSlot?.school_id}
          schoolTermId={
            selectedTimetableSlot
              ? Number(selectedTimetableSlot.school_term_id)
              : undefined
          }
        />
      ) : null}
      {/* Editing a row from ประวัติการมอบหมาย uses the same dialog as the live
          links above, and hands the link over as soon as it is saved. */}
      <AttendanceDelegationEditDialog
        delegation={delegationEdit}
        isTeachersLoading={delegationEditOptions.isLoading}
        onClose={() => setDelegationEdit(null)}
        onSaveAndShare={async (entry, input) => {
          if (!schoolId) return;
          const result = await updateAttendanceDelegation.mutateAsync({
            grantId: entry.grantId,
            schoolId: Number(schoolId),
            ...input,
          });
          await delegationHistoryQuery.refetch();
          // A teacher change closes the old link and answers with a new one.
          const accessUrl = result.accessUrl ?? entry.accessUrl;
          if (accessUrl) {
            setDelegationShare({
              accessUrl,
              description: `${entry.teacherDisplayName} · ${formatThaiDate(entry.attendanceDate)}`,
            });
          }
        }}
        teachers={delegationEditOptions.data?.teachers ?? []}
      />
      <LinkShareDialog
        description={delegationShare?.description}
        link={delegationShare?.accessUrl ?? ""}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDelegationShare(null);
        }}
        open={Boolean(delegationShare)}
        title="แชร์ลิงก์เช็กชื่อ"
      />
      {/* Same dialog the classroom and teacher-link pages use, so a comment
          filed from the roster lands in classroom_student_comments identically. */}
      <ClassroomStudentCommentDialog
        classroomId={Number(commentStudent?.classroom_id ?? 0)}
        onOpenChange={(open) => {
          if (!open) setCommentStudent(null);
        }}
        submitComment={async (input) => {
          await createClassroomComment.mutateAsync(input);
          // หมายเหตุ is served by the roster query, so refresh it or the new
          // note would only appear after a manual reload.
          await refetchRoster();
        }}
        student={
          commentStudent
            ? {
                studentUuid: commentStudent.id,
                firstName: commentStudent.first_name ?? commentStudent.name,
                lastName: commentStudent.last_name ?? "",
                studentNumber: commentStudent.student_number ?? null,
                photoUrl: commentStudent.photo_url,
              }
            : null
        }
      />
      {rosterClassroomId ? (
        <ClassroomRosterExportDialog
          classroomId={rosterClassroomId}
          classroomLabel={rosterClassroomLabel}
          onOpenChange={setExportOpen}
          open={exportOpen}
          search={attendanceSearch}
        />
      ) : null}
      <AttendanceReopenDialog
        error={reopenState.error}
        isPending={reopenState.isPending}
        onClose={() => setReopenDialogOpen(false)}
        onSubmit={handleReopen}
        open={reopenDialogOpen}
      />
    </PageShell>
  );
}
