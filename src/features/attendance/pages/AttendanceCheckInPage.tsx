import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, ClipboardList, Save } from "lucide-react";
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
import { ATTENDANCE_STATUS_META } from "../lib/attendance-presentation";
import type { AttendanceSelectionStatus } from "../types/attendance.types";
import { formatStudentRoom } from "../../students/lib/student-presentation";

const STATUS_BADGE_VARIANT: Record<
  AttendanceSelectionStatus,
  BadgeProps["variant"]
> = {
  P_PRESENT: "success",
  P_LATE: "warning",
  P_ABSENT: "destructive",
  NONE: "secondary",
};
import {
  getTodayIso,
  useAttendanceCheckIn,
  useAttendanceHistory,
} from "../hooks/useAttendanceCheckIn";

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
  const checkIn = useAttendanceCheckIn();
  const [historyDate, setHistoryDate] = useState(getTodayIso());
  // Pass the selected school so the server scopes history to one school's day
  // (it returns empty without it) — the history tab shares the today tab's scope.
  const history = useAttendanceHistory(historyDate, checkIn.schoolId);

  const {
    scope,
    schools,
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
  } = checkIn;

  const newCases = saveState.data?.newCases ?? [];

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
        <ToolbarControls className="sm:grid sm:grid-cols-4 sm:items-end">
          <ScopeField label="โรงเรียน">
            <Combobox
              disabled={scope.isSchoolLocked}
              onChange={(next) => setSchoolId(next)}
              options={[
                { value: "", label: "เลือกโรงเรียน" },
                ...schools.map((school) => ({
                  value: String(school.id),
                  label: school.name,
                })),
              ]}
              placeholder="ค้นหาโรงเรียน"
              value={schoolId}
            />
          </ScopeField>

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
                  เกิดข้อผิดพลาดระหว่างบันทึกการเช็คชื่อ กรุณาลองอีกครั้ง
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
            ) : isRosterLoading ? (
              <SkeletonTable rows={8} />
            ) : students.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="ไม่พบรายชื่อนักเรียนในห้องนี้"
                description="ลองเลือกชั้นเรียนหรือห้องอื่น"
              />
            ) : (
              <AttendanceStudentTable
                onStatusChange={setStatus}
                selections={selections}
                students={students}
              />
            )}

            {canLoadRoster && students.length > 0 ? (
              <div className="pointer-events-none sticky bottom-4 z-10 mt-2 flex justify-end">
                <Button
                  className="pointer-events-auto shadow-lg"
                  icon={Save}
                  isLoading={saveState.isPending}
                  loadingText="กำลังบันทึก"
                  onClick={save}
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
    </PageShell>
  );
}
