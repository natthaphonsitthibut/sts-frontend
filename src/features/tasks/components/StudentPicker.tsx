import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserRound, X } from "lucide-react";
import { Button, Combobox, Input } from "../../../components/base";
import { studentsService } from "../../students/api/students.service";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";

export interface SelectedStudent {
  /** Opaque linked-student identifier, or null when the name was typed manually. */
  personId: string | null;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  school: string;
  schoolId?: string | null;
}

interface StudentPickerProps {
  value: SelectedStudent | null;
  onChange: (value: SelectedStudent | null) => void;
  disabled?: boolean;
}

const MAX_RESULTS = 30;

/**
 * Pick a student from the real roster (scoped to the creator's own area) so a
 * home-visit links to an actual record instead of a free-typed name. Province →
 * district → sub-district → school narrow the (potentially huge) school list,
 * and the school itself is a searchable combobox. None of the filters are
 * required. Falls back to manual entry for students not yet in the system.
 */
export function StudentPicker({ value, onChange, disabled }: StudentPickerProps) {
  const scope = useScopeCascade({ lockToActorScope: true });
  const area = useSchoolAreaFilter();
  const [search, setSearch] = useState("");
  const [manual, setManual] = useState(false);
  const [manualFirstName, setManualFirstName] = useState("");
  const [manualLastName, setManualLastName] = useState("");

  const schoolOptions = useMemo(
    () =>
      area.schools.map((school) => ({ value: String(school.id), label: school.name })),
    [area.schools],
  );

  const term = search.trim();
  // Search server-side (scoped to the actor) so a name match is found even when
  // no school is picked; once 2+ chars are typed, or a school is chosen to browse.
  const canQuery = !manual && (Boolean(scope.schoolId) || term.length >= 2);

  const studentsQuery = useQuery({
    queryKey: [
      "student-picker",
      area.province,
      area.district,
      area.subDistrict,
      scope.schoolId,
      scope.grade,
      scope.room,
      term,
    ],
    queryFn: () =>
      studentsService.getStudents({
        province: area.province || undefined,
        district: area.district || undefined,
        subDistrict: area.subDistrict || undefined,
        schoolId: scope.schoolId || undefined,
        grade: scope.grade || undefined,
        room: scope.room || undefined,
        searchTerm: term || undefined,
        // Cap server-side: the picker only renders the first MAX_RESULTS.
        limit: 50,
      }),
    enabled: canQuery,
  });

  const students = useMemo(
    () => studentsQuery.data?.items ?? [],
    [studentsQuery.data],
  );
  const results = useMemo(() => students.slice(0, MAX_RESULTS), [students]);

  function handleProvince(next: string): void {
    area.setProvince(next);
    scope.setSchoolId("");
    if (manual) {
      updateManualStudent(manualFirstName, manualLastName, "");
    }
  }

  function handleDistrict(next: string): void {
    area.setDistrict(next);
    scope.setSchoolId("");
    if (manual) {
      updateManualStudent(manualFirstName, manualLastName, "");
    }
  }

  function handleSubDistrict(next: string): void {
    area.setSubDistrict(next);
    scope.setSchoolId("");
    if (manual) {
      updateManualStudent(manualFirstName, manualLastName, "");
    }
  }

  function resolveSchoolName(schoolId: string): string {
    return area.schools.find((school) => String(school.id) === schoolId)?.name ?? "";
  }

  function handleSchool(next: string, updateManual = false): void {
    scope.setSchoolId(next);
    const school = area.schools.find((candidate) => String(candidate.id) === next);
    area.setAreaFromSchool(school);
    if (updateManual) {
      updateManualStudent(manualFirstName, manualLastName, next);
    }
  }

  function updateManualStudent(
    firstName: string,
    lastName: string,
    schoolId = scope.schoolId,
  ): void {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const fullName = [trimmedFirstName, trimmedLastName].filter(Boolean).join(" ");
    if (!fullName) {
      onChange(null);
      return;
    }

    onChange({
      personId: null,
      name: fullName,
      firstName: trimmedFirstName || null,
      lastName: trimmedLastName || null,
      school: resolveSchoolName(schoolId),
      schoolId: schoolId || null,
    });
  }

  function enterManualMode(): void {
    setManualFirstName(search.trim());
    setManualLastName("");
    setManual(true);
    if (search.trim()) {
      updateManualStudent(search.trim(), "");
    }
  }

  if (value && !(manual && !value.personId)) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-900">{value.name}</div>
          <div className="truncate text-xs text-slate-500">
            {value.school || "ไม่ระบุโรงเรียน"}
            {value.personId ? "" : " · กรอกเอง"}
          </div>
        </div>
        <Button
          disabled={disabled}
          icon={X}
          onClick={() => {
            onChange(null);
            setSearch("");
            setManual(false);
            setManualFirstName("");
            setManualLastName("");
          }}
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
        {scope.schoolLocked ? null : (
          <div className="grid gap-2 sm:grid-cols-3">
            <Combobox
              disabled={disabled}
              onChange={handleProvince}
              options={[
                { value: "", label: "ทุกจังหวัด" },
                ...area.provinces.map((name) => ({ value: name, label: name })),
              ]}
              placeholder="ค้นหาจังหวัด"
              value={area.province}
            />
            <Combobox
              disabled={disabled || !area.province}
              onChange={handleDistrict}
              options={[
                { value: "", label: "ทุกอำเภอ/เขต" },
                ...area.districts.map((name) => ({ value: name, label: name })),
              ]}
              placeholder="ค้นหาอำเภอ/เขต"
              value={area.district}
            />
            <Combobox
              disabled={disabled || !area.district}
              onChange={handleSubDistrict}
              options={[
                { value: "", label: "ทุกตำบล/แขวง" },
                ...area.subDistricts.map((name) => ({ value: name, label: name })),
              ]}
              placeholder="ค้นหาตำบล/แขวง"
              value={area.subDistrict}
            />
          </div>
        )}

        {scope.schoolLocked ? (
          <Input disabled value={resolveSchoolName(scope.schoolId)} />
        ) : (
          <Combobox
            disabled={disabled}
            emptyText={
              area.schoolsEnabled
                ? "ไม่พบโรงเรียน"
                : "พิมพ์ชื่อโรงเรียน หรือเลือกจังหวัด/อำเภอ/เขต/ตำบล/แขวง"
            }
            onChange={(next) => handleSchool(next, true)}
            onSearchChange={area.setSchoolSearch}
            options={[
              { value: "", label: "เลือกโรงเรียน" },
              ...schoolOptions,
            ]}
            placeholder="ค้นหาโรงเรียน"
            value={scope.schoolId}
          />
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            disabled={disabled}
            onChange={(event) => {
              setManualFirstName(event.target.value);
              updateManualStudent(event.target.value, manualLastName);
            }}
            placeholder="ชื่อ"
            value={manualFirstName}
          />
          <Input
            disabled={disabled}
            onChange={(event) => {
              setManualLastName(event.target.value);
              updateManualStudent(manualFirstName, event.target.value);
            }}
            placeholder="นามสกุล"
            value={manualLastName}
          />
        </div>
        <button
          className="text-sm font-medium text-primary"
          onClick={() => {
            onChange(null);
            setSearch("");
            setManual(false);
            setManualFirstName("");
            setManualLastName("");
          }}
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
          <Combobox
            disabled={disabled}
            onChange={handleProvince}
            options={[
              { value: "", label: "ทุกจังหวัด" },
              ...area.provinces.map((name) => ({ value: name, label: name })),
            ]}
            placeholder="ค้นหาจังหวัด"
            value={area.province}
          />
          <Combobox
            disabled={disabled || !area.province}
            onChange={handleDistrict}
            options={[
              { value: "", label: "ทุกอำเภอ/เขต" },
              ...area.districts.map((name) => ({ value: name, label: name })),
            ]}
            placeholder="ค้นหาอำเภอ/เขต"
            value={area.district}
          />
          <Combobox
            disabled={disabled || !area.district}
            onChange={handleSubDistrict}
            options={[
              { value: "", label: "ทุกตำบล/แขวง" },
              ...area.subDistricts.map((name) => ({ value: name, label: name })),
            ]}
            placeholder="ค้นหาตำบล/แขวง"
            value={area.subDistrict}
          />
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        {scope.schoolLocked ? (
          <Input
            className="sm:col-span-3"
            disabled
            value={area.schools.find((s) => String(s.id) === scope.schoolId)?.name ?? ""}
          />
        ) : (
          <Combobox
            disabled={disabled}
            emptyText={
              area.schoolsEnabled
                ? "ไม่พบโรงเรียน"
                : "พิมพ์ชื่อโรงเรียน หรือเลือกจังหวัด/อำเภอ/เขต/ตำบล/แขวง"
            }
            onChange={handleSchool}
            onSearchChange={area.setSchoolSearch}
            options={[{ value: "", label: "ทุกโรงเรียน" }, ...schoolOptions]}
            placeholder="ค้นหาโรงเรียน"
            value={scope.schoolId}
          />
        )}
        <Combobox
          disabled={disabled || !scope.schoolId || scope.gradeLocked}
          onChange={(next) => scope.setGrade(next)}
          options={[
            { value: "", label: "ทุกชั้น" },
            ...scope.gradeLevels.map((grade) => ({ value: grade.label, label: grade.label })),
          ]}
          placeholder="ค้นหาชั้น"
          value={scope.grade}
        />
        <Combobox
          disabled={disabled || !scope.grade || scope.roomLocked}
          onChange={(next) => scope.setRoom(next)}
          options={[
            { value: "", label: "ทุกห้อง" },
            ...scope.rooms.map((room) => ({ value: room, label: `ห้อง ${room}` })),
          ]}
          placeholder="ค้นหาห้อง"
          value={scope.room}
        />
      </div>

      <Input
        disabled={disabled}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="พิมพ์ชื่อนักเรียนเพื่อค้นหา"
        value={search}
      />

      {!canQuery ? (
        <p className="text-sm text-slate-500">
          พิมพ์ชื่อนักเรียนอย่างน้อย 2 ตัว หรือเลือกโรงเรียนเพื่อดูทั้งห้อง
        </p>
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
                    firstName: null,
                    lastName: null,
                    school: student.school_name ?? "",
                    schoolId: student.school_id ? String(student.school_id) : null,
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
        onClick={enterManualMode}
        type="button"
      >
        ไม่พบในระบบ? กรอกชื่อเอง
      </button>
    </div>
  );
}
