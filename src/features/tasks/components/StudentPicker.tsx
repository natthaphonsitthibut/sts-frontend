import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserRound, X } from "lucide-react";
import { Button, Combobox, Input, Select } from "../../../components/base";
import { studentsService } from "../../students/api/students.service";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";

export interface SelectedStudent {
  /** PersonID of a linked student, or null when the name was typed manually. */
  personId: string | null;
  name: string;
  school: string;
}

interface StudentPickerProps {
  value: SelectedStudent | null;
  onChange: (value: SelectedStudent | null) => void;
  disabled?: boolean;
}

const MAX_RESULTS = 30;

function unique(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
}

/**
 * Pick a student from the real roster (scoped to the creator's own area) so a
 * home-visit links to an actual record instead of a free-typed name. Province →
 * district → sub-district → school narrow the (potentially huge) school list,
 * and the school itself is a searchable combobox. None of the filters are
 * required. Falls back to manual entry for students not yet in the system.
 */
export function StudentPicker({ value, onChange, disabled }: StudentPickerProps) {
  const scope = useScopeCascade({ lockToActorScope: true });
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [subDistrict, setSubDistrict] = useState("");
  const [search, setSearch] = useState("");
  const [manual, setManual] = useState(false);

  const provinces = useMemo(
    () => unique(scope.schools.map((school) => school.province)),
    [scope.schools],
  );
  const districts = useMemo(
    () =>
      unique(
        scope.schools
          .filter((school) => !province || school.province === province)
          .map((school) => school.district),
      ),
    [scope.schools, province],
  );
  const subDistricts = useMemo(
    () =>
      unique(
        scope.schools
          .filter((school) => !province || school.province === province)
          .filter((school) => !district || school.district === district)
          .map((school) => school.sub_district),
      ),
    [scope.schools, province, district],
  );
  const schoolOptions = useMemo(
    () =>
      scope.schools
        .filter((school) => !province || school.province === province)
        .filter((school) => !district || school.district === district)
        .filter((school) => !subDistrict || school.sub_district === subDistrict)
        .map((school) => ({ value: String(school.id), label: school.name })),
    [scope.schools, province, district, subDistrict],
  );

  const studentsQuery = useQuery({
    queryKey: ["student-picker", scope.schoolId, scope.grade, scope.room],
    queryFn: () =>
      studentsService.getStudents({
        schoolId: scope.schoolId || undefined,
        grade: scope.grade || undefined,
        room: scope.room || undefined,
      }),
    enabled: !manual && Boolean(scope.schoolId),
  });

  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);
  const term = search.trim().toLowerCase();
  const results = useMemo(() => {
    const matched = term
      ? students.filter(
          (student) =>
            student.name.toLowerCase().includes(term) || student.id.includes(term),
        )
      : students;
    return matched.slice(0, MAX_RESULTS);
  }, [students, term]);

  function handleProvince(next: string): void {
    setProvince(next);
    setDistrict("");
    setSubDistrict("");
    scope.setSchoolId("");
  }

  function handleDistrict(next: string): void {
    setDistrict(next);
    setSubDistrict("");
    scope.setSchoolId("");
  }

  function handleSubDistrict(next: string): void {
    setSubDistrict(next);
    scope.setSchoolId("");
  }

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-900">{value.name}</div>
          <div className="truncate text-xs text-slate-500">
            {value.school || "ไม่ระบุโรงเรียน"}
            {value.personId ? ` · ${value.personId}` : " · กรอกเอง"}
          </div>
        </div>
        <Button
          disabled={disabled}
          icon={X}
          onClick={() => onChange(null)}
          size="sm"
          type="button"
          variant="ghost"
        >
          เปลี่ยน
        </Button>
      </div>
    );
  }

  if (manual) {
    return (
      <div className="space-y-2">
        <Input
          disabled={disabled}
          onChange={(event) =>
            onChange(
              event.target.value.trim()
                ? { personId: null, name: event.target.value, school: "" }
                : null,
            )
          }
          placeholder="กรอกชื่อนักเรียน"
        />
        <button
          className="text-sm font-medium text-primary"
          onClick={() => setManual(false)}
          type="button"
        >
          ← กลับไปค้นหาจากรายชื่อในระบบ
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {scope.schoolLocked ? null : (
        <div className="grid gap-2 sm:grid-cols-3">
          <Select
            disabled={disabled}
            onChange={(event) => handleProvince(event.target.value)}
            value={province}
          >
            <option value="">ทุกจังหวัด</option>
            {provinces.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
          <Select
            disabled={disabled || !province}
            onChange={(event) => handleDistrict(event.target.value)}
            value={district}
          >
            <option value="">ทุกอำเภอ</option>
            {districts.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
          <Select
            disabled={disabled || !district}
            onChange={(event) => handleSubDistrict(event.target.value)}
            value={subDistrict}
          >
            <option value="">ทุกตำบล</option>
            {subDistricts.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        {scope.schoolLocked ? (
          <Input
            className="sm:col-span-3"
            disabled
            value={scope.schools.find((s) => String(s.id) === scope.schoolId)?.name ?? ""}
          />
        ) : (
          <Combobox
            disabled={disabled}
            onChange={(next) => scope.setSchoolId(next)}
            options={schoolOptions}
            placeholder="ค้นหาโรงเรียน"
            value={scope.schoolId}
          />
        )}
        <Select
          disabled={disabled || !scope.schoolId || scope.gradeLocked}
          onChange={(event) => scope.setGrade(event.target.value)}
          value={scope.grade}
        >
          <option value="">ทุกชั้น</option>
          {scope.gradeLevels.map((grade) => (
            <option key={grade.id} value={grade.label}>
              {grade.label}
            </option>
          ))}
        </Select>
        <Select
          disabled={disabled || !scope.grade || scope.roomLocked}
          onChange={(event) => scope.setRoom(event.target.value)}
          value={scope.room}
        >
          <option value="">ทุกห้อง</option>
          {scope.rooms.map((room) => (
            <option key={room} value={room}>
              ห้อง {room}
            </option>
          ))}
        </Select>
      </div>

      <Input
        disabled={disabled}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="พิมพ์ชื่อหรือเลขบัตรเพื่อค้นหานักเรียน"
        value={search}
      />

      {!scope.schoolId ? (
        <p className="text-sm text-slate-500">เลือกโรงเรียนก่อนเพื่อค้นหานักเรียน</p>
      ) : studentsQuery.isLoading ? (
        <p className="text-sm text-slate-500">กำลังโหลดรายชื่อ...</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-slate-500">ไม่พบนักเรียนตามที่ค้นหา</p>
      ) : (
        <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
          {results.map((student) => (
            <li key={student.id}>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                onClick={() =>
                  onChange({
                    personId: student.id,
                    name: student.name,
                    school: student.school_name ?? "",
                  })
                }
                type="button"
              >
                <UserRound className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800">
                    {student.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {student.school_name ?? "-"} · {student.grade}/{student.room}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        className="text-sm font-medium text-primary"
        onClick={() => setManual(true)}
        type="button"
      >
        ไม่พบในระบบ? กรอกชื่อเอง
      </button>
    </div>
  );
}
