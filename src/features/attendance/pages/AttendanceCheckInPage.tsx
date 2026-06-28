import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  LockOpen,
  Save,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Combobox,
  Input,
  Label,
  Tabs,
  useConfirm,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
} from "../../../components/layout/data-table";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonTable,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import type { BadgeProps } from "../../../components/base";
import { AttendanceStudentTable } from "../components/AttendanceStudentTable";
import { SchoolAreaSchoolFilter } from "../components/SchoolAreaSchoolFilter";
import { getAttendanceSaveConfirm } from "../lib/attendance-save-confirm";
import { ATTENDANCE_STATUS_META } from "../lib/attendance-presentation";
import type { AttendanceSelectionStatus } from "../types/attendance.types";
import { formatStudentRoom } from "../../students/lib/student-presentation";
import { AttendanceReopenDialog } from "../components/AttendanceReopenDialog";
import { getApiErrorMessage } from "../../../lib/api-error";
import {
  getTodayIso,
  useAttendanceCheckIn,
  useAttendanceHistory,
} from "../hooks/useAttendanceCheckIn";

const STATUS_BADGE_VARIANT: Record<
  AttendanceSelectionStatus,
  BadgeProps["variant"]
> = {
  P_PRESENT: "success",
  P_LATE: "warning",
  P_ABSENT: "destructive",
  NONE: "secondary",
};

const TAB_OPTIONS = [
  { value: "today", label: "เช็คชื่อวันนี้" },
  { value: "history", label: "ประวัติการเช็คชื่อ" },
];

function ScopeField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function AttendanceCheckInPage() {
  const [tab, setTab] = useState("today");
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const checkIn = useAttendanceCheckIn();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [historyDate, setHistoryDate] = useState(getTodayIso());
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

  const newCases = saveState.data?.newCases ?? [];

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
  const filteredHistory = useMemo(
    () =>
      history.records.filter(
        (record) =>
          (!grade || record.grade === grade) &&
          (!room || String(record.room) === room),
      ),
    [history.records, grade, room],
  );

  return (
    <PageShell className="pb-6">
      <PageToolbar
        icon={ClipboardCheck}
        title="เช็คชื่อ"
        description="เลือกชั้นเรียนและบันทึกการเข้าเรียนของนักเรียน"
        actions={
          <Tabs
            aria-label="โหมดเช็คชื่อ"
            value={tab}
            onChange={setTab}
            options={TAB_OPTIONS}
          />
        }
      >
        <ToolbarControls className="sm:grid sm:grid-cols-2 sm:items-end lg:grid-cols-3 xl:grid-cols-7">
          <SchoolAreaSchoolFilter
            area={schoolArea}
            onSchoolChange={setSchoolId}
            schoolId={schoolId}
            schoolLocked={scope.isSchoolLocked}
          />

          <ScopeField label="ระดับชั้น">
            <Combobox
              disabled={scope.isGradeLocked || !schoolId}
              onChange={(next) => setGrade(next)}
              options={[
                { value: "", label: schoolId ? "เลือกชั้น" : "เลือกโรงเรียนก่อน" },
                ...gradeLevels.map((level) => ({ value: level.label, label: level.label })),
              ]}
              searchable={false}
              value={grade}
            />
          </ScopeField>

          <ScopeField label="ห้อง">
            <Combobox
              disabled={scope.isRoomLocked || !grade}
              onChange={(next) => setRoom(next)}
              options={[
                { value: "", label: grade ? "เลือกห้อง" : "เลือกชั้นก่อน" },
                ...rooms.map((roomOption) => ({ value: roomOption, label: `ห้อง ${roomOption}` })),
              ]}
              searchable={false}
              value={room}
            />
          </ScopeField>

          <ScopeField label="วันที่">
            {tab === "today" ? (
              <Input aria-label="วันที่" type="date" value={getTodayIso()} readOnly disabled />
            ) : (
              <Input
                aria-label="เลือกวันที่"
                type="date"
                value={historyDate}
                onChange={(event) => setHistoryDate(event.target.value)}
              />
            )}
          </ScopeField>
        </ToolbarControls>
      </PageToolbar>

      {tab === "today" ? (
        <>
          {canLoadRoster && students.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge className="min-w-[68px]" variant="success">
                มา {counts.present}
              </Badge>
              <Badge className="min-w-[68px]" variant="warning">
                สาย {counts.late}
              </Badge>
              <Badge className="min-w-[68px]" variant="destructive">
                ขาด {counts.absent}
              </Badge>
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
                title="พร้อมเริ่มเช็คชื่อหรือยัง?"
                description="กรุณาเลือกโรงเรียน ระดับชั้น และห้อง เพื่อแสดงรายชื่อนักเรียน"
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
      ) : filteredHistory.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="ไม่พบประวัติการเช็คชื่อ"
          description="ยังไม่มีการบันทึกการเช็คชื่อตามวันที่และชั้นเรียนที่เลือก"
        />
      ) : (
        <DataTable
          headings={["นักเรียน", "ชั้น / ห้อง", "สถานะ", "ผู้บันทึก"]}
          responsive={false}
        >
          {filteredHistory.map((record) => (
            <DataTableRow key={record.id}>
              <DataTableCell className="font-bold text-slate-800">
                {record.name || "-"}
              </DataTableCell>
              <DataTableCell className="text-sm text-slate-600">
                {record.grade || "-"} / {formatStudentRoom(record.room)}
              </DataTableCell>
              <DataTableCell>
                <Badge variant={STATUS_BADGE_VARIANT[record.status]}>
                  {ATTENDANCE_STATUS_META[record.status].label}
                </Badge>
              </DataTableCell>
              <DataTableCell className="text-sm text-slate-500">
                {record.recorded_by || "-"}
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTable>
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
