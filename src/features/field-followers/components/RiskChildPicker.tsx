import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { Checkbox, Combobox, Input } from "../../../components/base";
import { studentsService } from "../../students/api/students.service";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";

export interface RiskChildOption {
  id: string;
  name: string;
  school: string;
}

interface RiskChildPickerProps {
  selectedIds: ReadonlySet<string>;
  onToggle: (student: RiskChildOption, checked: boolean) => void;
  maxSelected: number;
  disabled?: boolean;
}

const MAX_RESULTS = 30;

/**
 * Multi-select variant of StudentPicker for the field-monitor risk map — no
 * manual/free-text entry (every pin must resolve to a real student_uuid) and
 * checking stops once `maxSelected` is reached (existing checks stay togglable).
 */
export function RiskChildPicker({
  selectedIds,
  onToggle,
  maxSelected,
  disabled,
}: RiskChildPickerProps) {
  const scope = useScopeCascade({ lockToActorScope: true });
  const area = useSchoolAreaFilter();
  const [search, setSearch] = useState("");

  const schoolOptions = useMemo(
    () => area.schools.map((school) => ({ value: String(school.id), label: school.name })),
    [area.schools],
  );

  const term = search.trim();
  const canQuery = Boolean(scope.schoolId) || term.length >= 2;
  const atCap = selectedIds.size >= maxSelected;

  const studentsQuery = useQuery({
    queryKey: [
      "risk-child-picker",
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
        limit: 50,
      }),
    enabled: canQuery,
  });

  const results = useMemo(
    () => (studentsQuery.data?.items ?? []).slice(0, MAX_RESULTS),
    [studentsQuery.data],
  );

  return (
    <div className="space-y-2">
      {scope.schoolLocked ? null : (
        <div className="grid gap-2 sm:grid-cols-3">
          <Combobox
            disabled={disabled}
            onChange={(next) => {
              area.setProvince(next);
              scope.setSchoolId("");
            }}
            options={[
              { value: "", label: "ทุกจังหวัด" },
              ...area.provinces.map((name) => ({ value: name, label: name })),
            ]}
            placeholder="ค้นหาจังหวัด"
            value={area.province}
          />
          <Combobox
            disabled={disabled || !area.province}
            onChange={(next) => {
              area.setDistrict(next);
              scope.setSchoolId("");
            }}
            options={[
              { value: "", label: "ทุกอำเภอ/เขต" },
              ...area.districts.map((name) => ({ value: name, label: name })),
            ]}
            placeholder="ค้นหาอำเภอ/เขต"
            value={area.district}
          />
          <Combobox
            disabled={disabled || !area.district}
            onChange={(next) => {
              area.setSubDistrict(next);
              scope.setSchoolId("");
            }}
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
            onChange={(next) => {
              scope.setSchoolId(next);
              area.setAreaFromSchool(area.schools.find((s) => String(s.id) === next));
            }}
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

      {atCap ? (
        <p className="text-sm font-medium text-warning-700">
          เลือกครบ {maxSelected} คนแล้ว — เอาคนที่เลือกไว้ออกก่อนถึงจะเลือกเพิ่มได้
        </p>
      ) : null}

      {!canQuery ? (
        <p className="text-sm text-slate-500">
          พิมพ์ชื่อนักเรียนอย่างน้อย 2 ตัว หรือเลือกโรงเรียนเพื่อดูทั้งห้อง
        </p>
      ) : studentsQuery.isLoading ? (
        <p className="text-sm text-slate-500">กำลังโหลดรายชื่อ...</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-slate-500">ไม่พบนักเรียนตามที่ค้นหา</p>
      ) : (
        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
          {results.map((student) => {
            const checked = selectedIds.has(student.id);
            const rowDisabled = disabled || (!checked && atCap);
            return (
              <li key={student.id}>
                <div
                  className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-50 aria-disabled:opacity-50"
                  aria-disabled={rowDisabled}
                >
                  <Checkbox
                    aria-label={`เลือก ${student.name}`}
                    checked={checked}
                    disabled={rowDisabled}
                    onChange={(event) =>
                      onToggle(
                        {
                          id: student.id,
                          name: student.name,
                          school: student.school_name ?? "",
                        },
                        event.currentTarget.checked,
                      )
                    }
                  />
                  <UserRound className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-800">
                      {student.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {student.school_name ?? "-"} · {student.grade}/{student.room}
                    </span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
