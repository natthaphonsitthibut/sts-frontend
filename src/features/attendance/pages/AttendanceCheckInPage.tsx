import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  History,
  LockOpen,
  Search,
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
  Input,
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
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SearchInput,
  SkeletonTable,
  ToolbarControls,
  ToolbarFilterGrid,
} from "../../../components/layout/page-primitives";
import { AttendanceRosterTable } from "../components/AttendanceRosterTable";
import { SchoolClassRoomFilter } from "../components/SchoolClassRoomFilter";
import { getAttendanceSaveConfirm } from "../lib/attendance-save-confirm";
import {
  getAttendanceStatusPresentation,
  getIsoDayOfWeekFromDateString,
} from "../lib/attendance-presentation";
import type { AttendanceHistoryRecord } from "../types/attendance.types";
import { formatStudentRoom } from "../../students/lib/student-presentation";
import { AttendanceReopenDialog } from "../components/AttendanceReopenDialog";
import { getApiErrorMessage } from "../../../lib/api-error";
import {
  getTodayIso,
  useAttendanceCheckInForSession,
  useAttendanceHistory,
} from "../hooks/useAttendanceCheckIn";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";
import { usePeriodTimes, useTimetableSlots } from "../../timetable/hooks/useTimetable";
import { formatTimetableSlotLabel } from "../../timetable/lib/period-times";
import type { SchoolPeriodTime, TimetableSlot } from "../../timetable/types/timetable.types";
import { StudentAvatar } from "../../students/components/StudentAvatar";


const TAB_OPTIONS = [
  { value: "today", label: "เช็คชื่อวันนี้" },
  { value: "history", label: "ประวัติ" },
];

function compareText(a: string | undefined, b: string | undefined): number {
  return (a || "").localeCompare(b || "", "th");
}

function getHistorySortValue(
  record: AttendanceHistoryRecord,
  key: string,
  catalog: readonly StatusCatalogItem[],
): string {
  if (key === "student") return record.name || record.student_name || "";
  if (key === "grade") return record.grade || "";
  if (key === "room") return formatStudentRoom(record.room);
  if (key === "status") return getAttendanceStatusPresentation(record.status, catalog).label;
  if (key === "recorder") return record.recorded_by || record.RecordedBy || "";
  return "";
}

function timeToMinutes(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

// Sort key for a slot with no bell-schedule time: past every real
// minute-of-day value (max 1439), so untimed slots order after timed ones
// while still sorting among themselves by period number.
const UNTIMED_SLOT_SORT_BASE = 10_000;

function slotSortKey(row: { startsAt: number | null; slot: TimetableSlot }): number {
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
        (row) => row.day_of_week === slot.day_of_week && row.period === slot.period,
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
  const attendanceStatusCatalog = useStatusCatalog("ATTENDANCE_RECORD").items;
  const [tab, setTab] = useRouteTab(
    {
      today: "/attendance",
      history: "/attendance/history",
    } as const,
    "today",
  );
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceSort, setAttendanceSort] = useState<DataTableSortState | undefined>({
    key: "name",
    direction: "asc",
  });
  const [historySort, setHistorySort] = useState<DataTableSortState | undefined>();
  const [selectedSlotId, setSelectedSlotId] = useState("");
  // Defaults to today but stays editable — lets a teacher check in for an
  // earlier date (e.g. catching up after the fact). Never a future date; the
  // backend rejects that too.
  const [checkInDate, setCheckInDate] = useState(getTodayIso());
  const isCheckInDateToday = checkInDate === getTodayIso();
  const selectedSlotIdNumber = selectedSlotId ? Number(selectedSlotId) : null;
  const checkIn = useAttendanceCheckInForSession({
    enabled: Boolean(selectedSlotIdNumber),
    timetableSlotId: selectedSlotIdNumber,
    date: checkInDate,
  });
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [historyDate, setHistoryDate] = useState(getTodayIso());
  const [historySearch, setHistorySearch] = useState("");
  // Pass the selected school so the server scopes history to one school's day
  // (it returns empty without it) — the history tab shares the today tab's scope.
  const history = useAttendanceHistory(historyDate, checkIn.schoolId);

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
    counts,
    canLoadRoster,
    isRosterLoading,
    isRosterError,
    refetchRoster,
    save,
    saveState,
    sessionContext,
    isSessionLoading,
    isSessionError,
    canEditAttendance,
    reopen,
    reopenState,
    schoolArea,
  } = checkIn;
  const selectedGradeLevel = gradeLevels.find((level) => level.label === grade);
  const selectedRoomNo = Number(room);
  const timetableFilter =
    schoolId && selectedGradeLevel && Number.isInteger(selectedRoomNo)
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
        .filter((slot) => slot.day_of_week === getIsoDayOfWeekFromDateString(checkInDate))
        .sort((left, right) => left.period - right.period),
    [slotsQuery.data?.data, checkInDate],
  );
  const subjectSlotOptions = useMemo(
    () => [
      { value: "", label: slotsForDate.length > 0 ? "เลือกคาบรายวิชา" : "ไม่พบคาบวันที่เลือก" },
      ...slotsForDate.map((slot) => ({
        value: String(slot.id),
        label: `${slot.subject_name_th} · ${formatTimetableSlotLabel(
          slot,
          periodTimesQuery.data?.data ?? [],
        )}`,
      })),
    ],
    [periodTimesQuery.data?.data, slotsForDate],
  );

  // Default the subject-mode slot to "now" from the room's timetable — only
  // while viewing today, since "current time" has no meaning for a picked
  // past date — without locking it: reassign only while the current
  // selection isn't one of the picked date's slots (mode/date just switched,
  // or school/grade/room changed underneath it). A user's own pick is always
  // left alone since it's already in slotsForDate. Adjusting state during
  // render (not in an effect) per
  // https://react.dev/learn/you-might-not-need-an-effect — React restarts
  // this render with the new value before anything commits, so `checkIn`
  // below still sees the resolved slot on the same pass.
  if (!slotsForDate.some((slot) => String(slot.id) === selectedSlotId)) {
    const defaultSlot = isCheckInDateToday
      ? findDefaultSlot(slotsForDate, periodTimesQuery.data?.data ?? [])
      : null;
    const defaultSlotId = defaultSlot ? String(defaultSlot.id) : "";
    if (defaultSlotId !== selectedSlotId) {
      setSelectedSlotId(defaultSlotId);
    }
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
    if (!students.length || saveState.isPending || !canEditAttendance) {
      return;
    }

    const confirmed = await confirm(getAttendanceSaveConfirm(counts));
    if (!confirmed) {
      return;
    }

    save();
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

  const visibleStudents = useMemo(() => {
    const keyword = attendanceSearch.trim().toLocaleLowerCase("th-TH");
    const filtered = students.filter((student) =>
      !keyword
        ? true
        : `${student.name} ${student.student_number ?? ""}`
            .toLocaleLowerCase("th-TH")
            .includes(keyword),
    );
    if (!attendanceSort) return filtered;
    return [...filtered].sort((left, right) => {
      const leftValue =
        attendanceSort.key === "studentNumber"
          ? left.student_number ?? ""
          : left.name;
      const rightValue =
        attendanceSort.key === "studentNumber"
          ? right.student_number ?? ""
          : right.name;
      const result = leftValue.localeCompare(rightValue, "th");
      return attendanceSort.direction === "asc" ? result : -result;
    });
  }, [attendanceSearch, attendanceSort, students]);

  // History uses the same school/grade/room scope as the today tab — filter the
  // records client-side by the selected class so both tabs behave consistently.
  const scopedHistory = useMemo(
    () =>
      history.records.filter(
        (record) =>
          (!grade || record.grade === grade) &&
          (!room || String(record.room) === room),
      ),
    [history.records, grade, room],
  );
  const filteredHistory = useMemo(
    () => {
      const keyword = historySearch.trim().toLocaleLowerCase("th-TH");
      return scopedHistory.filter((record) => {
        if (!keyword) return true;
        const statusLabel = getAttendanceStatusPresentation(
          record.status,
          attendanceStatusCatalog,
        ).label;
        return [
          record.name,
          record.student_name,
          record.grade,
          String(record.room ?? ""),
          record.recorded_by,
          record.RecordedBy,
          statusLabel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("th-TH")
          .includes(keyword);
      });
    },
    [attendanceStatusCatalog, historySearch, scopedHistory],
  );
  const sortedHistory = useMemo(() => {
    if (!historySort) return filteredHistory;
    return [...filteredHistory].sort((a, b) => {
      const result = compareText(
        getHistorySortValue(a, historySort.key, attendanceStatusCatalog),
        getHistorySortValue(b, historySort.key, attendanceStatusCatalog),
      );
      return historySort.direction === "asc" ? result : -result;
    });
  }, [attendanceStatusCatalog, filteredHistory, historySort]);

  return (
    <PageShell className="pb-6">
      <PageToolbar
        icon={ClipboardCheck}
        title="เช็คชื่อมาเรียน"
        description="บันทึกการมาเรียนประจำวันของนักเรียนในแต่ละห้อง"
        navigation={
          <Tabs
            aria-label="โหมดเช็คชื่อ"
            value={tab}
            onChange={setTab}
            options={TAB_OPTIONS}
          />
        }
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
            scope={filterScope}
          />

          {tab === "history" ? (
            <DatePicker
              ariaLabel="เลือกวันที่"
              className="sm:w-[180px]"
              value={historyDate}
              onChange={setHistoryDate}
            />
          ) : null}
        </ToolbarFilterGrid>
      </PageToolbar>

      {tab === "today" ? (
        <ToolbarControls className="mb-5">
          <SearchInput
            className="sm:max-w-[560px]"
            onChange={setAttendanceSearch}
            placeholder="ค้นหา"
            value={attendanceSearch}
          />
          <DropdownMenu
            align="start"
            ariaLabel="เครื่องมือการเช็คชื่อ"
            items={[
              {
                id: "qr",
                label: "สแกน QR Code เพื่อเช็คชื่อ (เร็ว ๆ นี้)",
                disabled: true,
                onSelect: () => undefined,
              },
              {
                id: "delegate",
                label: "มอบหมายการเช็คชื่อ (เร็ว ๆ นี้)",
                disabled: true,
                onSelect: () => undefined,
              },
              {
                id: "import",
                label: "นำเข้าไฟล์การเช็คชื่อ (เร็ว ๆ นี้)",
                disabled: true,
                onSelect: () => undefined,
              },
            ]}
            trigger={(triggerProps) => (
              <Button {...triggerProps} icon={Wrench} variant="outline">
                เครื่องมือ
              </Button>
            )}
          />
          <Button
            className="sm:ml-auto"
            icon={History}
            onClick={() => void navigate("/attendance/history")}
          >
            ประวัติการเช็คชื่อ
          </Button>
        </ToolbarControls>
      ) : null}

      {tab === "today" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <div className="mb-4 w-[270px] max-w-full">
            <Label htmlFor="attendance-date">วันที่</Label>
            <DatePicker
              ariaLabel="เลือกวันที่เช็คชื่อ"
              id="attendance-date"
              max={getTodayIso()}
              value={checkInDate}
              onChange={(next) => handleCheckInDateChange(next || getTodayIso())}
            />
          </div>
          <div className="mb-4 w-[270px] max-w-full">
            <Label htmlFor="attendance-period">คาบเรียน</Label>
            <Select
              disabled={!timetableFilter || slotsQuery.isLoading || slotsForDate.length === 0}
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

          {saveState.isError ? (
            <div className="mb-4">
              <Alert variant="destructive">
                <AlertTitle>บันทึกไม่สำเร็จ</AlertTitle>
                <AlertDescription>
                  {getApiErrorMessage(
                    saveState.error,
                    "เกิดข้อผิดพลาดระหว่างบันทึกการเช็คชื่อ กรุณาลองอีกครั้ง",
                  )}
                </AlertDescription>
              </Alert>
            </div>
          ) : saveState.isSuccess ? (
            <div className="mb-4">
              <Alert variant="success">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                  <div>
                    <AlertTitle>บันทึกการเช็คชื่อเรียบร้อยแล้ว</AlertTitle>
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

          {canLoadRoster && sessionContext && !sessionContext.calendarConfigured ? (
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
                    <AlertTitle>ส่งการเช็คชื่อแล้ว</AlertTitle>
                    <AlertDescription>
                      Revision {sessionContext.session.revision} · บันทึกแล้ว {sessionContext.session.recordedCount} คน
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
                <AlertTitle>ตรวจสอบรอบเช็คชื่อไม่สำเร็จ</AlertTitle>
                <AlertDescription>กรุณาโหลดหน้าใหม่ก่อนบันทึกข้อมูล</AlertDescription>
              </Alert>
            </div>
          ) : null}

          <div className="space-y-4">
            {!canLoadRoster ? (
              <EmptyState
                icon={ClipboardList}
                title="เลือกคาบรายวิชาก่อนเช็คชื่อ"
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
                    <StudentAvatar
                      name={student.name}
                      photoUrl={student.photo_url}
                    />
                  ),
                }))}
                selections={selections}
                sort={attendanceSort}
              />
            )}

            {canLoadRoster && students.length > 0 && canEditAttendance ? (
              <div className="mt-4 flex justify-end">
                <Button
                  disabled={isSessionError}
                  isLoading={saveState.isPending}
                  loadingText="กำลังบันทึก"
                  type="submit"
                >
                  บันทึกการเช็คชื่อ {students.length} คน
                </Button>
              </div>
            ) : null}
          </div>
        </form>
      ) : history.isError ? (
        <ErrorState
          title="ไม่สามารถโหลดประวัติการเช็คชื่อได้"
          onRetry={() => void history.refetch()}
        />
      ) : history.isLoading ? (
        <SkeletonTable rows={6} />
      ) : scopedHistory.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="ไม่พบประวัติการเช็คชื่อ"
          description="ยังไม่มีการบันทึกการเช็คชื่อสำหรับวันที่ ชั้น และห้องที่เลือก"
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
                />
                <Input
                  aria-label="ค้นหาประวัติเช็คชื่อ"
                  className="pl-9"
                  onChange={(event) => setHistorySearch(event.target.value)}
                  placeholder="ค้นหาชื่อนักเรียน ผู้บันทึก หรือสถานะ"
                  value={historySearch}
                />
              </div>
              <p className="shrink-0 rounded-full bg-slate-50 px-3 py-2 text-xs font-bold tabular-nums text-slate-500">
                แสดง {filteredHistory.length} จาก {scopedHistory.length} คน
              </p>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="ไม่พบประวัติการเช็คชื่อ"
              description="ลองเปลี่ยนคำค้นหา ชั้น หรือห้อง"
            />
          ) : (
            <DataTable
              headings={[
                { label: "นักเรียน", sortKey: "student" },
                { label: "ชั้น", sortKey: "grade" },
                { label: "ห้อง", sortKey: "room" },
                { label: "สถานะ", sortKey: "status" },
                { label: "ผู้บันทึก", sortKey: "recorder" },
              ]}
              onSortChange={setHistorySort}
              responsive={false}
              sort={historySort}
            >
              {sortedHistory.map((record) => (
                <DataTableRow key={record.id}>
                  <DataTableCell className="text-slate-800">
                    {record.name || "-"}
                  </DataTableCell>
                  <DataTableCell className="text-sm text-slate-600">
                    {record.grade || "-"}
                  </DataTableCell>
                  <DataTableCell className="text-sm text-slate-600">
                    {formatStudentRoom(record.room)}
                  </DataTableCell>
                  <DataTableCell>
                    {(() => {
                      const meta = getAttendanceStatusPresentation(
                        record.status,
                        attendanceStatusCatalog,
                      );
                      return (
                        <Badge variant={meta.badgeVariant}>
                          {meta.label}
                        </Badge>
                      );
                    })()}
                  </DataTableCell>
                  <DataTableCell className="text-sm text-slate-500">
                    {record.recorded_by || "-"}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTable>
          )}
        </div>
      )}
      {confirmDialog}
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
