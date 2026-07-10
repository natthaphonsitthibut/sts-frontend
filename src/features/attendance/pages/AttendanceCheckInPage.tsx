import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  LockOpen,
  Save,
  Search,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Combobox,
  Input,
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
  SkeletonTable,
  ToolbarFilterGrid,
} from "../../../components/layout/page-primitives";
import { AttendanceStudentTable } from "../components/AttendanceStudentTable";
import { SchoolClassRoomFilter } from "../components/SchoolClassRoomFilter";
import { getAttendanceSaveConfirm } from "../lib/attendance-save-confirm";
import { getAttendanceStatusPresentation } from "../lib/attendance-presentation";
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
import { AttendanceCountBadges } from "../components/AttendanceCountBadges";
import { usePeriodTimes, useTimetableSlots } from "../../timetable/hooks/useTimetable";
import { formatTimetableSlotLabel } from "../../timetable/lib/period-times";
import type { SchoolPeriodTime, TimetableSlot } from "../../timetable/types/timetable.types";


const TAB_OPTIONS = [
  { value: "today", label: "เช็คชื่อวันนี้" },
  { value: "history", label: "ประวัติ" },
];

const CHECK_IN_MODE_OPTIONS = [
  { value: "daily", label: "รายวัน" },
  { value: "subject", label: "รายวิชา" },
] satisfies Array<{ value: CheckInMode; label: string }>;

type CheckInMode = "daily" | "subject";

function compareText(a: string | undefined, b: string | undefined): number {
  return (a || "").localeCompare(b || "", "th");
}

function getHistorySortValue(
  record: AttendanceHistoryRecord,
  key: string,
  catalog: readonly StatusCatalogItem[],
): string {
  if (key === "student") return record.name || record.student_name || "";
  if (key === "class") return `${record.grade || ""}/${formatStudentRoom(record.room)}`;
  if (key === "status") return getAttendanceStatusPresentation(record.status, catalog).label;
  if (key === "recorder") return record.recorded_by || record.RecordedBy || "";
  return "";
}

function getIsoDayOfWeek(date = new Date()): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function timeToMinutes(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
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
    .sort((left, right) => {
      const leftStart = left.startsAt ?? left.slot.period * 1000;
      const rightStart = right.startsAt ?? right.slot.period * 1000;
      return leftStart - rightStart;
    });

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
  const attendanceStatusCatalog = useStatusCatalog("ATTENDANCE_RECORD").items;
  const [tab, setTab] = useRouteTab(
    {
      today: "/attendance",
      history: "/attendance/history",
    } as const,
    "today",
  );
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [historySort, setHistorySort] = useState<DataTableSortState | undefined>();
  const [checkInMode, setCheckInMode] = useState<CheckInMode>("daily");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const selectedSlotIdNumber =
    checkInMode === "subject" && selectedSlotId ? Number(selectedSlotId) : null;
  const checkIn = useAttendanceCheckInForSession({
    enabled: checkInMode === "daily" || Boolean(selectedSlotIdNumber),
    timetableSlotId: selectedSlotIdNumber,
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
    setAllStatus,
    undoSelections,
    canUndoSelections,
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
  const todaySlots = useMemo(
    () =>
      (slotsQuery.data?.data ?? [])
        .filter((slot) => slot.day_of_week === getIsoDayOfWeek())
        .sort((left, right) => left.period - right.period),
    [slotsQuery.data?.data],
  );
  const subjectSlotOptions = useMemo(
    () => [
      { value: "", label: todaySlots.length > 0 ? "เลือกคาบรายวิชา" : "ไม่พบคาบวันนี้" },
      ...todaySlots.map((slot) => ({
        value: String(slot.id),
        label: `${slot.subject_name_th} · ${formatTimetableSlotLabel(
          slot,
          periodTimesQuery.data?.data ?? [],
        )}`,
      })),
    ],
    [periodTimesQuery.data?.data, todaySlots],
  );

  useEffect(() => {
    let timeoutId: number | undefined;

    if (checkInMode !== "subject") {
      timeoutId = window.setTimeout(() => setSelectedSlotId(""), 0);
      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    if (todaySlots.some((slot) => String(slot.id) === selectedSlotId)) {
      return undefined;
    }

    const defaultSlot = findDefaultSlot(todaySlots, periodTimesQuery.data?.data ?? []);
    timeoutId = window.setTimeout(
      () => setSelectedSlotId(defaultSlot ? String(defaultSlot.id) : ""),
      0,
    );
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [checkInMode, periodTimesQuery.data?.data, selectedSlotId, todaySlots]);

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
        actions={
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
            onGradeChange={setGrade}
            onRoomChange={setRoom}
            onSchoolChange={setSchoolId}
            scope={filterScope}
          />

          {tab === "today" ? (
            <>
              <Input
                aria-label="วันที่"
                className="sm:w-[180px]"
                type="date"
                value={getTodayIso()}
                readOnly
                disabled
              />
              <Tabs
                aria-label="รูปแบบเช็คชื่อ"
                onChange={(value) => setCheckInMode(value as CheckInMode)}
                options={CHECK_IN_MODE_OPTIONS}
                value={checkInMode}
              />
              {checkInMode === "subject" ? (
                <Combobox
                  disabled={!timetableFilter || slotsQuery.isLoading || todaySlots.length === 0}
                  onChange={setSelectedSlotId}
                  options={subjectSlotOptions}
                  placeholder="เลือกคาบรายวิชา"
                  value={selectedSlotId}
                />
              ) : null}
            </>
          ) : (
            <Input
              aria-label="เลือกวันที่"
              className="sm:w-[180px]"
              type="date"
              value={historyDate}
              onChange={(event) => setHistoryDate(event.target.value)}
            />
          )}
        </ToolbarFilterGrid>
      </PageToolbar>

      {tab === "today" ? (
        <>
          {canLoadRoster && students.length > 0 ? (
            <div className="mb-3">
              <AttendanceCountBadges catalog={attendanceStatusCatalog} counts={counts} />
            </div>
          ) : null}

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
                title={
                  checkInMode === "subject"
                    ? "เลือกคาบรายวิชาก่อนเช็คชื่อ"
                    : "พร้อมเริ่มเช็คชื่อหรือยัง?"
                }
                description={
                  checkInMode === "subject"
                    ? "กรุณาเลือกโรงเรียน ระดับชั้น ห้อง และคาบรายวิชาของวันนี้"
                    : "กรุณาเลือกโรงเรียน ระดับชั้น และห้อง เพื่อแสดงรายชื่อนักเรียน"
                }
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
                description="ลองเลือกชั้นเรียนหรือห้องอื่น"
              />
            ) : (
              <AttendanceStudentTable
                canUndo={canUndoSelections}
                disabled={!canEditAttendance || isSessionError}
                onBulkStatusChange={setAllStatus}
                onStatusChange={setStatus}
                onUndo={undoSelections}
                selections={selections}
                students={students}
              />
            )}

            {canLoadRoster && students.length > 0 && canEditAttendance ? (
              <div className="pointer-events-none sticky bottom-4 z-10 mt-2 flex justify-end">
                <Button
                  className="pointer-events-auto shadow-lg"
                  icon={Save}
                  isLoading={saveState.isPending}
                  loadingText="กำลังบันทึก"
                  onClick={() => void handleSave()}
                  size="lg"
                >
                  บันทึกข้อมูล
                </Button>
              </div>
            ) : null}
          </div>
        </>
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
          description="ยังไม่มีการบันทึกการเช็คชื่อตามวันที่และชั้นเรียนที่เลือก"
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
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
              description="ลองเปลี่ยนคำค้นหา ชั้นเรียน หรือห้อง"
            />
          ) : (
            <DataTable
              headings={[
                { label: "นักเรียน", sortKey: "student" },
                { label: "ชั้น / ห้อง", sortKey: "class" },
                { label: "สถานะ", sortKey: "status" },
                { label: "ผู้บันทึก", sortKey: "recorder" },
              ]}
              onSortChange={setHistorySort}
              responsive={false}
              sort={historySort}
            >
              {sortedHistory.map((record) => (
                <DataTableRow key={record.id}>
                  <DataTableCell className="font-bold text-slate-800">
                    {record.name || "-"}
                  </DataTableCell>
                  <DataTableCell className="text-sm text-slate-600">
                    {record.grade || "-"} / {formatStudentRoom(record.room)}
                  </DataTableCell>
                  <DataTableCell>
                    <Badge
                      variant={
                        getAttendanceStatusPresentation(
                          record.status,
                          attendanceStatusCatalog,
                        ).badgeVariant
                      }
                    >
                      {getAttendanceStatusPresentation(
                        record.status,
                        attendanceStatusCatalog,
                      ).label}
                    </Badge>
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
