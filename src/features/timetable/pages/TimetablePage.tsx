import { useState } from "react";
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
  Input,
  Tabs,
  useConfirm,
} from "../../../components/base";
import { EmptyState, PageShell, PageToolbar } from "../../../components/layout/page-primitives";
import { getApiErrorMessage } from "../../../lib/api-error";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { attendanceService } from "../../attendance/api/attendance.service";
import { RoomPicker, type RoomSelection } from "../components/RoomPicker";
import { SchoolPeriodTimesDialog } from "../components/SchoolPeriodTimesDialog";
import { TimetableGrid } from "../components/TimetableGrid";
import { useCreateSubject, useSubjects } from "../hooks/useSubjects";
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
import type { TimetableSlot } from "../types/timetable.types";

const DAY_OPTIONS = Object.entries(DAY_LABELS).map(([value, label]) => ({ value, label }));
const PERIOD_OPTIONS = Array.from({ length: 10 }, (_, i) => String(i + 1)).map((value) => ({
  value,
  label: `คาบ ${value}`,
}));

function AddSlotForm({
  editingSlot,
  onDone,
  room,
}: {
  editingSlot?: TimetableSlot | null;
  onDone: () => void;
  room: RoomSelection;
}) {
  const [dayOfWeek, setDayOfWeek] = useState(String(editingSlot?.day_of_week ?? 1));
  const [period, setPeriod] = useState(String(editingSlot?.period ?? 1));
  const [subjectId, setSubjectId] = useState(
    editingSlot ? String(editingSlot.subject_id) : "",
  );
  const [teacherUserId, setTeacherUserId] = useState(
    editingSlot?.teacher_user_id ? String(editingSlot.teacher_user_id) : "",
  );
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [addingSubject, setAddingSubject] = useState(false);
  const allSubjectsQuery = useSubjects({ isActive: true });
  const roomSubjectsQuery = useRoomSubjects(room);
  const createSubject = useCreateSubject();
  const createSlot = useCreateTimetableSlot();
  const updateSlot = useUpdateTimetableSlot();
  const teachersQuery = useTimetableTeachers({ schoolId: room.schoolId });
  const termsQuery = useQuery({
    queryKey: ["timetable-active-term", room.schoolId],
    queryFn: () => attendanceService.getTerms(room.schoolId),
    enabled: !editingSlot,
  });
  const activeTerm = termsQuery.data?.find((term) => term.status === "ACTIVE");

  const subjectOptions = [
    ...(allSubjectsQuery.data?.data ?? []).map((subject) => ({
      value: String(subject.id),
      label: subject.name_th,
    })),
    ...(roomSubjectsQuery.data?.data ?? [])
      .filter(
        (subject) =>
          !(allSubjectsQuery.data?.data ?? []).some((item) => item.id === subject.subject_id),
      )
      .map((subject) => ({
        value: String(subject.subject_id),
        label: subject.name_th,
      })),
  ];
  const teacherOptions = (teachersQuery.data?.data ?? []).map((teacher) => ({
    value: String(teacher.id),
    label: teacher.display_name,
  }));
  const disableSaveReason = !subjectId
    ? "เลือกวิชาก่อนบันทึก"
    : !editingSlot && !activeTerm
      ? "ต้องมีเทอม ACTIVE ก่อนบันทึกคาบสอน"
      : "";

  function handleCreateSubject(): void {
    if (!newSubjectCode.trim() || !newSubjectName.trim()) return;
    createSubject.mutate(
      { code: newSubjectCode.trim(), nameTh: newSubjectName.trim() },
      {
        onSuccess: (result) => {
          setSubjectId(String(result.data.id));
          setNewSubjectCode("");
          setNewSubjectName("");
          setAddingSubject(false);
        },
      },
    );
  }

  function handleSubmit(): void {
    if (!subjectId) return;
    if (editingSlot) {
      updateSlot.mutate(
        {
          id: editingSlot.id,
          payload: {
            subjectId: Number(subjectId),
            teacherUserId: teacherUserId ? Number(teacherUserId) : null,
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
        teacherUserId: teacherUserId ? Number(teacherUserId) : null,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-card">
      {!editingSlot && !termsQuery.isLoading && !activeTerm ? (
        <Alert variant="warning">
          <AlertDescription>ยังไม่มีเทอมที่เปิดใช้งาน (ACTIVE) สำหรับโรงเรียนนี้</AlertDescription>
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
            options={PERIOD_OPTIONS}
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
            onChange={setSubjectId}
            options={[{ value: "", label: "เลือกวิชา" }, ...subjectOptions]}
            placeholder="ค้นหาวิชา"
            value={subjectId}
          />
        </FormItem>
        <FormItem>
          <FormLabel htmlFor="slot-teacher">ผู้สอน</FormLabel>
          <Combobox
            emptyText="ไม่พบผู้สอนในขอบเขตโรงเรียนนี้"
            id="slot-teacher"
            onChange={setTeacherUserId}
            options={[{ value: "", label: "ยังไม่ระบุผู้สอน" }, ...teacherOptions]}
            placeholder="เลือกผู้สอน"
            value={teacherUserId}
          />
        </FormItem>
      </div>

      {addingSubject ? (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[160px_1fr_auto] items-end">
          {createSubject.isError ? (
            <Alert className="sm:col-span-3" variant="destructive">
              <AlertDescription>
                {getApiErrorMessage(createSubject.error, "เพิ่มวิชาไม่สำเร็จ")}
              </AlertDescription>
            </Alert>
          ) : null}
          <FormItem>
            <FormLabel required>รหัสวิชา</FormLabel>
            <Input
              onChange={(event) => setNewSubjectCode(event.target.value)}
              placeholder="เช่น TH101"
              value={newSubjectCode}
            />
          </FormItem>
          <FormItem>
            <FormLabel required>ชื่อวิชา</FormLabel>
            <Input
              onChange={(event) => setNewSubjectName(event.target.value)}
              placeholder="เช่น ภาษาไทย"
              value={newSubjectName}
            />
          </FormItem>
          <div className="pb-[2px]">
            <Button
              disabled={!newSubjectCode.trim() || !newSubjectName.trim()}
              isLoading={createSubject.isPending}
              onClick={handleCreateSubject}
              type="button"
            >
              เพิ่มวิชา
            </Button>
          </div>
        </div>
      ) : (
        <button
          className="text-sm font-medium text-primary"
          onClick={() => setAddingSubject(true)}
          type="button"
        >
          + ไม่พบวิชาที่ต้องการ? เพิ่มวิชาใหม่
        </button>
      )}

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
        <p className="text-right text-sm font-medium text-slate-500">{disableSaveReason}</p>
      ) : null}
    </div>
  );
}

function ManageTimetableView({ room }: { room: RoomSelection | null }) {
  const [adding, setAdding] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const slotsQuery = useTimetableSlots(room);
  const periodTimesQuery = usePeriodTimes(room?.schoolId ?? null);
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

  const slots = slotsQuery.data?.data ?? [];
  const isEditing = Boolean(editingSlot);

  return (
    <div className="space-y-4">
      {room ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
          {/* Section header */}
          <div className="flex items-center justify-between px-5 py-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              ตารางสอน — {room.schoolName} ห้อง {room.roomNo}
            </h3>
            {!adding && !isEditing ? (
              <Button icon={Plus} onClick={() => setAdding(true)} size="sm">
                เพิ่มคาบสอน
              </Button>
            ) : null}
          </div>

          {/* Inline add / edit form */}
          {adding ? (
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
              <AddSlotForm onDone={() => setAdding(false)} room={room} />
            </div>
          ) : null}
          {editingSlot ? (
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
              <AddSlotForm
                editingSlot={editingSlot}
                key={editingSlot.id}
                onDone={() => setEditingSlot(null)}
                room={room}
              />
            </div>
          ) : null}

          {/* Content area */}
          {slotsQuery.isError ? (
            <div className="border-t border-slate-200 px-5 py-4">
              <Alert variant="destructive">
                <AlertDescription>
                  {getApiErrorMessage(slotsQuery.error, "โหลดตารางสอนไม่สำเร็จ")}
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
                  <div className="group/slot relative h-[4.5rem] overflow-hidden rounded-lg border border-slate-200 border-l-4 border-l-primary/60 bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-md">
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
                        className="text-primary"
                        icon={SquarePen}
                        onClick={() => {
                          setAdding(false);
                          setEditingSlot(slot);
                        }}
                        size="sm"
                        variant="ghost"
                      />
                      <IconButton
                        aria-label={`ลบคาบ ${slot.period} วัน${DAY_LABELS[slot.day_of_week]}`}
                        className="text-danger disabled:opacity-40"
                        disabled={deleteSlot.isPending}
                        icon={Trash2}
                        onClick={() => void handleDelete(slot)}
                        size="sm"
                        variant="ghost"
                      />
                    </div>
                  </div>
                )}
                periodTimes={periodTimesQuery.data?.data ?? []}
                slots={slots}
              />
            </div>
          )}
        </div>
      ) : null}
      {dialog}
    </div>
  );
}

function MyScheduleView({
  mode,
  room,
}: {
  mode: "mine" | "room";
  room: RoomSelection | null;
}) {
  const mineQuery = useMySchedule({ mine: true });
  const roomQuery = useMySchedule(
    room
      ? { schoolId: room.schoolId, gradeLevelId: room.gradeLevelId, roomNo: room.roomNo }
      : {},
  );
  const activeQuery = mode === "mine" ? mineQuery : roomQuery;
  const slots = activeQuery.data?.data ?? [];
  // "mine" has no single selected room to read schoolId from — fall back to
  // the first returned slot's school (a teacher's periods are, in practice,
  // within one school).
  const periodTimesSchoolId = mode === "room" ? (room?.schoolId ?? null) : (slots[0]?.school_id ?? null);
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
      ) : (
        <TimetableGrid
          renderSlot={
            mode === "mine"
              ? (slot) => (
                  <div className="min-h-12 rounded-md border border-slate-200 border-l-4 border-l-primary/60 bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="line-clamp-2 text-sm font-bold leading-5 text-slate-900">
                      {slot.subject_name_th}
                    </div>
                    <div className="mt-0.5 text-xs leading-4 text-slate-500">
                      ห้อง {slot.room_no}
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
  const isManager = can("manage-timetable");
  const [mode, setMode] = useState<"mine" | "room">("mine");
  const [room, setRoom] = useState<RoomSelection | null>(null);
  const [periodTimesDialogOpen, setPeriodTimesDialogOpen] = useState(false);

  return (
    <PageShell>
      <PageToolbar
        actions={
          isManager ? (
            <Button
              disabled={!room}
              icon={Clock3}
              onClick={() => setPeriodTimesDialogOpen(true)}
              variant="outline"
            >
              ตั้งเวลาคาบ
            </Button>
          ) : undefined
        }
        description={
          isManager
            ? "เลือกห้องเรียนเพื่อจัดตารางสอน — วิชาต้องเพิ่มในระบบก่อนจึงจะเลือกได้"
            : "ดูตารางเรียน/ตารางสอนตามสิทธิ์ของคุณ"
        }
        icon={CalendarClock}
        title="ตารางสอน"
      >
        {isManager ? (
          <RoomPicker onChange={setRoom} />
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
            {mode === "room" ? <RoomPicker onChange={setRoom} /> : null}
          </div>
        )}
      </PageToolbar>
      {isManager ? <ManageTimetableView room={room} /> : <MyScheduleView mode={mode} room={room} />}
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
