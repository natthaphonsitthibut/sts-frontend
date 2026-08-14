import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Clock3, Plus, SquarePen, Trash2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Combobox,
  FormItem,
  FormLabel,
  IconButton,
  MultiSelect,
  Tabs,
  useConfirm,
} from "../../../components/base";
import {
  EmptyState,
  PageShell,
  PageToolbar,
} from "../../../components/layout/page-primitives";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { ClearFiltersButton } from "../../../components/layout/clear-filters-button";
import { getApiErrorMessage } from "../../../lib/api-error";
import { useRouteTab } from "../../../hooks/useRouteTab";
import {
  formatClassLabel,
  formatRoomLabel,
} from "../../../lib/room-presentation";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { isStudentAccountSession } from "../../auth/lib/permissions";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { attendanceService } from "../../attendance/api/attendance.service";
import { RoomPicker, type RoomSelection } from "../components/RoomPicker";
import { SchoolPeriodTimesDialog } from "../components/SchoolPeriodTimesDialog";
import { TimetableGrid } from "../components/TimetableGrid";
import {
  useCreateTimetableSlot,
  useDeleteTimetableSlot,
  useMySchedule,
  usePeriodTimes,
  useRoomSubjects,
  useTimetableTeachers,
  useTimetableSlots,
  useUpdateTimetableSlot,
} from "../hooks/useTimetable";
import { DAY_LABELS } from "../lib/period-times";
import type { SchoolPeriodTime, TimetableSlot } from "../types/timetable.types";

const DAY_OPTIONS = Object.entries(DAY_LABELS).map(([value, label]) => ({
  value,
  label,
}));
/** Fallback period count before the school has generated any bell schedule at all. */
const DEFAULT_PERIOD_COUNT = 8;

/** Period choices come from the school's actual bell schedule, not a hardcoded cap. */
function getPeriodOptions(periodTimes: SchoolPeriodTime[]) {
  const configured = Array.from(
    new Set(periodTimes.map((row) => row.period)),
  ).sort((a, b) => a - b);
  const periods =
    configured.length > 0
      ? configured
      : Array.from({ length: DEFAULT_PERIOD_COUNT }, (_, index) => index + 1);
  return periods.map((value) => ({
    value: String(value),
    label: `คาบ ${value}`,
  }));
}

function AddSlotForm({
  editingSlot,
  initialDayOfWeek,
  initialPeriod,
  onDone,
  periodTimes,
  room,
}: {
  editingSlot?: TimetableSlot | null;
  initialDayOfWeek?: number;
  initialPeriod?: number;
  onDone: () => void;
  periodTimes: SchoolPeriodTime[];
  room: RoomSelection;
}) {
  const [dayOfWeek, setDayOfWeek] = useState(
    String(editingSlot?.day_of_week ?? initialDayOfWeek ?? 1),
  );
  const [period, setPeriod] = useState(
    String(editingSlot?.period ?? initialPeriod ?? 1),
  );
  const periodOptions = getPeriodOptions(periodTimes);
  const [subjectId, setSubjectId] = useState(
    editingSlot ? String(editingSlot.subject_id) : "",
  );
  const [teacherMembershipIds, setTeacherMembershipIds] = useState<string[]>(
    () => {
      if (editingSlot?.teacher_membership_ids?.length) {
        return editingSlot.teacher_membership_ids.map(String);
      }
      return [];
    },
  );
  const [teacherRequired, setTeacherRequired] = useState(false);
  const roomSubjectsQuery = useRoomSubjects(room);
  const createSlot = useCreateTimetableSlot();
  const updateSlot = useUpdateTimetableSlot();
  const teachersQuery = useTimetableTeachers(
    subjectId
      ? {
          schoolId: room.schoolId,
          gradeLevelId: room.gradeLevelId,
          roomNo: room.roomNo,
          subjectId: Number(subjectId),
        }
      : null,
  );
  const termsQuery = useQuery({
    queryKey: ["timetable-active-term", room.schoolId],
    queryFn: () => attendanceService.getTerms(room.schoolId),
    enabled: !editingSlot,
  });
  const activeTerm = termsQuery.data?.find((term) => term.status === "ACTIVE");

  const subjectOptions = (roomSubjectsQuery.data?.data ?? []).map(
    (subject) => ({
      value: String(subject.subject_id),
      label: `${subject.name_th}${subject.code ? ` (${subject.code})` : ""}`,
    }),
  );
  const teacherOptions = (teachersQuery.data?.data ?? []).map((teacher) => ({
    value: String(teacher.id),
    label: teacher.display_name,
  }));
  const selectableTeacherIds = new Set(
    teacherOptions.map((teacher) => teacher.value),
  );
  const selectedTeacherMembershipIds = teacherMembershipIds.filter((id) =>
    selectableTeacherIds.has(id),
  );

  const disableSaveReason = !subjectId
    ? "เลือกวิชาก่อนบันทึก"
    : !editingSlot && !activeTerm
      ? "ต้องมีภาคเรียนที่เปิดใช้งานก่อนบันทึกคาบสอน"
      : "";

  function handleSubmit(): void {
    if (!subjectId) return;
    if (selectedTeacherMembershipIds.length === 0) {
      setTeacherRequired(true);
      return;
    }
    if (editingSlot) {
      updateSlot.mutate(
        {
          id: editingSlot.id,
          payload: {
            subjectId: Number(subjectId),
            teacherMembershipIds: selectedTeacherMembershipIds.map(Number),
          },
        },
        { onSuccess: onDone },
      );
      return;
    }

    if (!activeTerm) return;
    createSlot.mutate(
      {
        schoolTermId: Number(activeTerm.id),
        schoolId: room.schoolId,
        gradeLevelId: room.gradeLevelId,
        roomNo: room.roomNo,
        dayOfWeek: Number(dayOfWeek),
        period: Number(period),
        subjectId: Number(subjectId),
        teacherMembershipIds: selectedTeacherMembershipIds.map(Number),
      },
      { onSuccess: onDone },
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      {!editingSlot && !termsQuery.isLoading && !activeTerm ? (
        <Alert variant="warning">
          <AlertDescription>
            โรงเรียนนี้ยังไม่มีภาคเรียนที่เปิดใช้งาน
          </AlertDescription>
        </Alert>
      ) : null}
      {createSlot.isError || updateSlot.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(
              createSlot.error ?? updateSlot.error,
              editingSlot ? "แก้ไขคาบสอนไม่สำเร็จ" : "เพิ่มคาบสอนไม่สำเร็จ",
            )}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-4">
        <FormItem>
          <FormLabel htmlFor="slot-day" required>
            วัน
          </FormLabel>
          <Combobox
            disabled={Boolean(editingSlot)}
            id="slot-day"
            onChange={setDayOfWeek}
            options={DAY_OPTIONS}
            searchable={false}
            value={dayOfWeek}
          />
        </FormItem>
        <FormItem>
          <FormLabel htmlFor="slot-period" required>
            คาบ
          </FormLabel>
          <Combobox
            disabled={Boolean(editingSlot)}
            id="slot-period"
            onChange={setPeriod}
            options={periodOptions}
            searchable={false}
            value={period}
          />
        </FormItem>
        <FormItem>
          <FormLabel htmlFor="slot-subject" required>
            วิชา
          </FormLabel>
          <Combobox
            id="slot-subject"
            onChange={(val) => {
              setSubjectId(val);
              setTeacherMembershipIds([]);
              setTeacherRequired(false);
            }}
            options={[{ value: "", label: "เลือกวิชา" }, ...subjectOptions]}
            placeholder="ค้นหาวิชาในหลักสูตร"
            value={subjectId}
          />
        </FormItem>
        <FormItem>
          <FormLabel htmlFor="slot-teacher" required>
            ผู้สอน
          </FormLabel>
          <MultiSelect
            ariaLabel="ผู้สอน"
            disabled={!subjectId}
            emptyText={
              !subjectId
                ? "เลือกวิชาก่อนเพื่อดูผู้สอน"
                : "ไม่พบผู้สอนสำหรับวิชานี้ในหลักสูตร"
            }
            id="slot-teacher"
            onChange={(values) => {
              setTeacherMembershipIds(values);
              setTeacherRequired(false);
            }}
            options={teacherOptions}
            placeholder="เลือกผู้สอน"
            value={selectedTeacherMembershipIds}
          />
        </FormItem>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={onDone} type="button" variant="outline">
          ยกเลิก
        </Button>
        <Button
          disabled={(!editingSlot && !activeTerm) || !subjectId}
          isLoading={createSlot.isPending || updateSlot.isPending}
          onClick={handleSubmit}
          type="button"
        >
          {editingSlot ? "บันทึกการแก้ไข" : "บันทึก"}
        </Button>
      </div>
      {disableSaveReason ? (
        <p className="text-right text-sm font-medium text-slate-500">
          {disableSaveReason}
        </p>
      ) : null}
      {teacherRequired ? (
        <p className="text-right text-sm font-medium text-danger" role="alert">
          กรุณาเลือกผู้สอนอย่างน้อย 1 คนก่อนบันทึก
        </p>
      ) : null}
    </div>
  );
}

function ManageTimetableView({ room }: { room: RoomSelection | null }) {
  const [adding, setAdding] = useState(false);
  const [addPrefill, setAddPrefill] = useState<{
    dayOfWeek: number;
    period: number;
  } | null>(null);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const slotsQuery = useTimetableSlots(room);
  const periodTimesQuery = usePeriodTimes(room?.schoolId ?? null);
  const periodTimes = periodTimesQuery.data?.data ?? [];
  const deleteSlot = useDeleteTimetableSlot();
  const { confirm, dialog } = useConfirm();

  async function handleDelete(slot: TimetableSlot): Promise<void> {
    const accepted = await confirm({
      title: "ลบคาบสอนนี้?",
      description: `${slot.subject_name_th} — วัน${DAY_LABELS[slot.day_of_week]} คาบ ${slot.period}`,
      confirmText: "ลบ",
      variant: "destructive",
    });
    if (accepted) {
      deleteSlot.mutate(slot.id);
    }
  }

  function handleAddAtCell(dayOfWeek: number, period: number): void {
    setEditingSlot(null);
    setAddPrefill({ dayOfWeek, period });
    setAdding(true);
  }

  function handleAddDone(): void {
    setAdding(false);
    setAddPrefill(null);
  }

  const slots = slotsQuery.data?.data ?? [];
  const isEditing = Boolean(editingSlot);

  return (
    <div className="space-y-4">
      {room ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {/* Section header */}
          <div className="flex items-center justify-between px-5 py-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              ตารางสอน — {room.schoolName} {room.gradeLevelLabel}{" "}
              {formatRoomLabel(room.roomNo)}
            </h3>
            <div className="flex items-center gap-2">
              <RefreshButton
                onRefresh={() =>
                  Promise.all([
                    slotsQuery.refetch(),
                    periodTimesQuery.refetch(),
                  ])
                }
                updatedAt={Math.max(
                  slotsQuery.dataUpdatedAt,
                  periodTimesQuery.dataUpdatedAt,
                )}
              />
              {!adding && !isEditing ? (
                <Button
                  icon={Plus}
                  onClick={() => {
                    setAddPrefill(null);
                    setAdding(true);
                  }}
                >
                  เพิ่มคาบสอน
                </Button>
              ) : null}
            </div>
          </div>

          {/* Inline add / edit form */}
          {adding ? (
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
              <AddSlotForm
                initialDayOfWeek={addPrefill?.dayOfWeek}
                initialPeriod={addPrefill?.period}
                key={
                  addPrefill
                    ? `${addPrefill.dayOfWeek}-${addPrefill.period}`
                    : "new"
                }
                onDone={handleAddDone}
                periodTimes={periodTimes}
                room={room}
              />
            </div>
          ) : null}
          {editingSlot ? (
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
              <AddSlotForm
                editingSlot={editingSlot}
                key={editingSlot.id}
                onDone={() => setEditingSlot(null)}
                periodTimes={periodTimes}
                room={room}
              />
            </div>
          ) : null}

          {/* Content area */}
          {slotsQuery.isError ? (
            <div className="border-t border-slate-200 px-5 py-4">
              <Alert variant="destructive">
                <AlertDescription>
                  {getApiErrorMessage(
                    slotsQuery.error,
                    "โหลดตารางสอนไม่สำเร็จ",
                  )}
                </AlertDescription>
              </Alert>
            </div>
          ) : null}

          {slots.length === 0 && !slotsQuery.isLoading ? (
            <div className="border-t border-slate-200 px-5 py-4">
              <EmptyState
                description={`กด "เพิ่มคาบสอน" ด้านบนเพื่อเริ่มจัดตารางของห้องนี้`}
                icon={CalendarClock}
                title="ห้องนี้ยังไม่มีตารางสอน"
              />
            </div>
          ) : (
            <div className="border-t border-slate-200">
              <TimetableGrid
                borderless
                renderSlot={(slot) => (
                  <div className="group/slot relative h-[4.5rem] overflow-hidden rounded-lg border border-slate-200 bg-white px-2.5 py-2 transition-colors hover:border-slate-300">
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-1 bg-primary/60"
                    />
                    <div>
                      <div className="line-clamp-2 text-sm font-bold leading-5 text-slate-900">
                        {slot.subject_name_th}
                      </div>
                      <div className="mt-0.5 line-clamp-1 text-xs leading-4 text-slate-500">
                        {slot.teacher_name || "ยังไม่ระบุผู้สอน"}
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center gap-1 rounded-lg bg-white/80 opacity-0 backdrop-blur-[2px] transition-opacity group-hover/slot:opacity-100">
                      <IconButton
                        aria-label={`แก้ไขคาบ ${slot.period} วัน${DAY_LABELS[slot.day_of_week]}`}
                        icon={SquarePen}
                        onClick={() => {
                          setAdding(false);
                          setEditingSlot(slot);
                        }}
                        variant="edit"
                      />
                      <IconButton
                        aria-label={`ลบคาบ ${slot.period} วัน${DAY_LABELS[slot.day_of_week]}`}
                        disabled={deleteSlot.isPending}
                        icon={Trash2}
                        onClick={() => void handleDelete(slot)}
                        variant="delete"
                      />
                    </div>
                  </div>
                )}
                onAddSlot={handleAddAtCell}
                periodTimes={periodTimes}
                slots={slots}
              />
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          description="เลือกห้องเรียนด้านบนเพื่อดูหรือจัดตารางสอน"
          icon={CalendarClock}
          title="ยังไม่ได้เลือกห้องเรียน"
        />
      )}
      {dialog}
    </div>
  );
}

function MyScheduleView({
  includeConfiguredSchedule = false,
  mode,
  room,
}: {
  includeConfiguredSchedule?: boolean;
  mode: "mine" | "room";
  room: RoomSelection | null;
}) {
  const mineQuery = useMySchedule({ mine: true });
  const roomQuery = useMySchedule(
    room
      ? {
          schoolId: room.schoolId,
          gradeLevelId: room.gradeLevelId,
          roomNo: room.roomNo,
        }
      : {},
  );
  const activeQuery = mode === "mine" ? mineQuery : roomQuery;
  const slots = activeQuery.data?.data ?? [];
  // "mine" has no single selected room to read schoolId from — fall back to
  // the first returned slot's school (a teacher's periods are, in practice,
  // within one school).
  const periodTimesSchoolId =
    mode === "room" ? (room?.schoolId ?? null) : (slots[0]?.school_id ?? null);
  const periodTimesQuery = usePeriodTimes(periodTimesSchoolId);

  return (
    <div className="space-y-4">
      {activeQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(activeQuery.error, "โหลดตารางไม่สำเร็จ")}
          </AlertDescription>
        </Alert>
      ) : null}
      {activeQuery.isLoading ? (
        <div className="py-10 text-center text-slate-500">กำลังโหลด...</div>
      ) : mode === "room" && !room ? (
        <EmptyState
          description="เลือกห้องเรียนด้านบนเพื่อดูตารางเรียนของห้องนั้น"
          icon={CalendarClock}
          title="ยังไม่ได้เลือกห้องเรียน"
        />
      ) : slots.length === 0 ? (
        <EmptyState
          description={
            mode === "mine"
              ? "ตารางสอนของคุณจะแสดงที่นี่เมื่อฝ่ายบริหารจัดตารางให้"
              : "ห้องนี้ยังไม่มีตารางสอนในระบบ"
          }
          icon={CalendarClock}
          title={
            mode === "mine" ? "คุณยังไม่มีตารางสอน" : "ห้องนี้ยังไม่มีตารางสอน"
          }
        />
      ) : (
        <TimetableGrid
          includeConfiguredSchedule={includeConfiguredSchedule}
          renderSlot={
            mode === "mine"
              ? (slot) => (
                  <div className="relative min-h-12 overflow-hidden rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-1 bg-primary/60"
                    />
                    <div className="line-clamp-2 text-sm font-bold leading-5 text-slate-900">
                      {slot.subject_name_th}
                    </div>
                    <div className="mt-0.5 text-xs leading-4 text-slate-500">
                      {formatClassLabel(slot.grade_label, slot.room_no)}
                    </div>
                  </div>
                )
              : undefined
          }
          periodTimes={periodTimesQuery.data?.data ?? []}
          slots={slots}
        />
      )}
    </div>
  );
}

export function TimetablePage() {
  const { can } = usePermissions();
  const currentUser = useAuthSessionStore((state) => state.user);
  const isStudent = isStudentAccountSession(currentUser);
  const isManager = can("manage-timetable");
  const [routeMode, setMode] = useRouteTab(
    { mine: "/timetable/mine", room: "/timetable/rooms" },
    "mine",
  );
  const mode = isManager ? "room" : isStudent ? "mine" : routeMode;
  const [room, setRoom] = useState<RoomSelection | null>(null);
  const [roomPickerKey, setRoomPickerKey] = useState(0);
  const [periodTimesDialogOpen, setPeriodTimesDialogOpen] = useState(false);

  useEffect(() => {
    if (isManager && routeMode !== "room") setMode("room");
    if (isStudent && routeMode !== "mine") setMode("mine");
  }, [isManager, isStudent, routeMode, setMode]);

  return (
    <PageShell>
      <PageToolbar
        actions={
          isManager ? (
            <Button
              disabled={!room}
              icon={Clock3}
              onClick={() => setPeriodTimesDialogOpen(true)}
            >
              ตั้งเวลาคาบ
            </Button>
          ) : undefined
        }
        description={
          isStudent
            ? "ดูตารางเรียนของคุณตามชั้นและห้องปัจจุบัน"
            : isManager
              ? "เลือกห้องเรียนเพื่อจัดตารางสอน — วิชาต้องเพิ่มในระบบก่อนจึงจะเลือกได้"
              : "ดูตารางเรียน/ตารางสอนตามสิทธิ์ของคุณ"
        }
        icon={CalendarClock}
        title={isStudent ? "ตารางเรียน" : "ตารางสอน"}
        footerActions={
          isManager || mode === "room" ? (
            <ClearFiltersButton
              onClear={() => {
                setRoom(null);
                setRoomPickerKey((current) => current + 1);
              }}
            />
          ) : undefined
        }
      >
        {isStudent ? null : isManager ? (
          <RoomPicker key={roomPickerKey} onChange={setRoom} />
        ) : (
          <div className="space-y-3">
            <Tabs
              aria-label="โหมดดูตาราง"
              onChange={(next) => setMode(next as "mine" | "room")}
              options={[
                { value: "mine", label: "ตารางของฉัน" },
                { value: "room", label: "เลือกห้องเรียน" },
              ]}
              value={mode}
            />
            {mode === "room" ? (
              <RoomPicker key={roomPickerKey} onChange={setRoom} />
            ) : null}
          </div>
        )}
      </PageToolbar>
      {isManager ? (
        <ManageTimetableView room={room} />
      ) : (
        <MyScheduleView
          includeConfiguredSchedule={isStudent}
          mode={isStudent ? "mine" : mode}
          room={isStudent ? null : room}
        />
      )}
      {room ? (
        <SchoolPeriodTimesDialog
          onClose={() => setPeriodTimesDialogOpen(false)}
          open={periodTimesDialogOpen}
          schoolId={room.schoolId}
          schoolName={room.schoolName}
        />
      ) : null}
    </PageShell>
  );
}
