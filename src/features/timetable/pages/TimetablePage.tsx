import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Combobox,
  Tabs,
  useConfirm,
} from "../../../components/base";
import { PageShell, PageToolbar } from "../../../components/layout/page-primitives";
import { getApiErrorMessage } from "../../../lib/api-error";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { attendanceService } from "../../attendance/api/attendance.service";
import { RoomPicker, type RoomSelection } from "../components/RoomPicker";
import { useCreateSubject, useSubjects } from "../hooks/useSubjects";
import {
  useCreateTimetableSlot,
  useDeleteTimetableSlot,
  useMySchedule,
  useTimetableTeachers,
  useTimetableSlots,
} from "../hooks/useTimetable";
import { DAY_LABELS, getPeriodTimeLabel } from "../lib/period-times";
import type { TimetableSlot } from "../types/timetable.types";

const DAY_OPTIONS = Object.entries(DAY_LABELS).map(([value, label]) => ({ value, label }));
const PERIOD_OPTIONS = Array.from({ length: 10 }, (_, i) => String(i + 1)).map((value) => ({
  value,
  label: `คาบ ${value}`,
}));

function groupByDay(slots: TimetableSlot[]): Array<[number, TimetableSlot[]]> {
  const map = new Map<number, TimetableSlot[]>();
  for (const slot of slots) {
    const list = map.get(slot.day_of_week) ?? [];
    list.push(slot);
    map.set(slot.day_of_week, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([day, list]) => [day, list.sort((a, b) => a.period - b.period)]);
}

function ScheduleList({ slots }: { slots: TimetableSlot[] }) {
  if (slots.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white py-10 text-center text-slate-500 shadow-card">
        ไม่มีตารางสอน
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {groupByDay(slots).map(([day, daySlots]) => (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card" key={day}>
          <h3 className="mb-3 text-sm font-extrabold text-slate-900">วัน{DAY_LABELS[day]}</h3>
          <ul className="space-y-2">
            {daySlots.map((slot) => (
              <li
                className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                key={slot.id}
              >
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">คาบ {slot.period}</Badge>
                  <div>
                    <div className="font-medium text-slate-800">{slot.subject_name_th}</div>
                    <div className="text-xs text-slate-500">
                      {getPeriodTimeLabel(slot.period)} · {slot.subject_code}
                    </div>
                  </div>
                </div>
                <span className="text-sm text-slate-500">{slot.teacher_name || "ไม่ระบุครูผู้สอน"}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function AddSlotForm({ room, onDone }: { room: RoomSelection; onDone: () => void }) {
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [period, setPeriod] = useState("1");
  const [subjectId, setSubjectId] = useState("");
  const [teacherUserId, setTeacherUserId] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [addingSubject, setAddingSubject] = useState(false);
  const allSubjectsQuery = useSubjects({ isActive: true });
  const createSubject = useCreateSubject();
  const createSlot = useCreateTimetableSlot();
  const teachersQuery = useTimetableTeachers({ schoolId: room.schoolId });
  const termsQuery = useQuery({
    queryKey: ["timetable-active-term", room.schoolId],
    queryFn: () => attendanceService.getTerms(room.schoolId),
  });
  const activeTerm = termsQuery.data?.find((term) => term.status === "ACTIVE");

  const subjectOptions = (allSubjectsQuery.data?.data ?? []).map((subject) => ({
    value: String(subject.id),
    label: `${subject.name_th} (${subject.code})`,
  }));
  const teacherOptions = (teachersQuery.data?.data ?? []).map((teacher) => ({
    value: String(teacher.id),
    label: teacher.display_name,
  }));

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
    if (!activeTerm || !subjectId) return;
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
      {!termsQuery.isLoading && !activeTerm ? (
        <Alert variant="warning">
          <AlertDescription>ยังไม่มีเทอมที่เปิดใช้งาน (ACTIVE) สำหรับโรงเรียนนี้</AlertDescription>
        </Alert>
      ) : null}
      {createSlot.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(createSlot.error, "เพิ่มคาบสอนไม่สำเร็จ")}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-4">
        <Combobox onChange={setDayOfWeek} options={DAY_OPTIONS} searchable={false} value={dayOfWeek} />
        <Combobox onChange={setPeriod} options={PERIOD_OPTIONS} searchable={false} value={period} />
        <Combobox
          onChange={setSubjectId}
          options={[{ value: "", label: "เลือกวิชา" }, ...subjectOptions]}
          placeholder="ค้นหาวิชา"
          value={subjectId}
        />
        <Combobox
          emptyText="ไม่พบผู้สอนในขอบเขตโรงเรียนนี้"
          onChange={setTeacherUserId}
          options={[{ value: "", label: "ยังไม่ระบุผู้สอน" }, ...teacherOptions]}
          placeholder="เลือกผู้สอน"
          value={teacherUserId}
        />
      </div>

      {addingSubject ? (
        <div className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[160px_1fr_auto]">
          {createSubject.isError ? (
            <Alert className="sm:col-span-3" variant="destructive">
              <AlertDescription>
                {getApiErrorMessage(createSubject.error, "เพิ่มวิชาไม่สำเร็จ")}
              </AlertDescription>
            </Alert>
          ) : null}
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            onChange={(event) => setNewSubjectCode(event.target.value)}
            placeholder="รหัสวิชา"
            value={newSubjectCode}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            onChange={(event) => setNewSubjectName(event.target.value)}
            placeholder="ชื่อวิชา"
            value={newSubjectName}
          />
          <Button
            isLoading={createSubject.isPending}
            onClick={handleCreateSubject}
            size="sm"
            type="button"
          >
            เพิ่มวิชา
          </Button>
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
          disabled={!activeTerm || !subjectId}
          isLoading={createSlot.isPending}
          onClick={handleSubmit}
          type="button"
        >
          บันทึก
        </Button>
      </div>
    </div>
  );
}

function ManageTimetableView({ room }: { room: RoomSelection | null }) {
  const [adding, setAdding] = useState(false);
  const slotsQuery = useTimetableSlots(room);
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

  return (
    <div className="space-y-4">
      {room ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">
              ตารางสอน — {room.schoolName} ห้อง {room.roomNo}
            </h3>
            {!adding ? (
              <Button icon={Plus} onClick={() => setAdding(true)} size="sm" variant="outline">
                เพิ่มคาบสอน
              </Button>
            ) : null}
          </div>

          {adding ? <AddSlotForm onDone={() => setAdding(false)} room={room} /> : null}

          {slotsQuery.isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {getApiErrorMessage(slotsQuery.error, "โหลดตารางสอนไม่สำเร็จ")}
              </AlertDescription>
            </Alert>
          ) : null}

          {slots.length === 0 && !slotsQuery.isLoading ? (
            <div className="rounded-lg border border-slate-200 bg-white py-10 text-center text-slate-500 shadow-card">
              ห้องนี้ยังไม่มีตารางสอน
            </div>
          ) : (
            <div className="space-y-4">
              {groupByDay(slots).map(([day, daySlots]) => (
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card" key={day}>
                  <h4 className="mb-3 text-sm font-extrabold text-slate-900">วัน{DAY_LABELS[day]}</h4>
                  <ul className="space-y-2">
                    {daySlots.map((slot) => (
                      <li
                        className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                        key={slot.id}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">คาบ {slot.period}</Badge>
                          <div>
                            <div className="font-medium text-slate-800">{slot.subject_name_th}</div>
                            <div className="text-xs text-slate-500">
                              {getPeriodTimeLabel(slot.period)} · {slot.subject_code} ·{" "}
                              {slot.teacher_name || "ยังไม่ระบุผู้สอน"}
                            </div>
                          </div>
                        </div>
                        <Button
                          aria-label={`ลบคาบ ${slot.period} วัน${DAY_LABELS[day]}`}
                          disabled={deleteSlot.isPending}
                          icon={Trash2}
                          onClick={() => void handleDelete(slot)}
                          size="sm"
                          variant="ghost"
                        >
                          ลบ
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
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
        <ScheduleList slots={slots} />
      )}
    </div>
  );
}

export function TimetablePage() {
  const { can } = usePermissions();
  const isManager = can("manage-timetable");
  const [mode, setMode] = useState<"mine" | "room">("mine");
  const [room, setRoom] = useState<RoomSelection | null>(null);

  return (
    <PageShell>
      <PageToolbar
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
    </PageShell>
  );
}
