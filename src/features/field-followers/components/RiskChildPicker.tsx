import { useMemo } from "react";
import { UserRound } from "lucide-react";
import { Checkbox, Combobox, Input } from "../../../components/base";
import { formatRoomLabel, toRoomOption } from "../../../lib/room-presentation";
import { STUDENT_RISK_TIER_FILTER_OPTIONS } from "../../students/lib/student-presentation";
import type { RiskChildPickerController } from "../hooks/useRiskChildPickerController";

export interface RiskChildOption {
  id: string;
  name: string;
  school: string;
}

interface RiskChildPickerProps {
  controller: RiskChildPickerController;
  selectedIds: ReadonlySet<string>;
  onToggle: (student: RiskChildOption, checked: boolean) => void;
  maxSelected: number;
  disabled?: boolean;
}

/**
 * Multi-select variant of StudentPicker for the field-monitor risk map — no
 * manual/free-text entry (every pin must resolve to a real student_uuid) and
 * checking stops once `maxSelected` is reached (existing checks stay togglable).
 */
export function RiskChildPicker({
  controller,
  selectedIds,
  onToggle,
  maxSelected,
  disabled,
}: RiskChildPickerProps) {
  const {
    area,
    results,
    riskTier,
    scope,
    search,
    setRiskTier,
    setSearch,
    studentsQuery,
  } = controller;

  const schoolOptions = useMemo(
    () =>
      area.schools.map((school) => ({
        value: String(school.id),
        label: school.name,
      })),
    [area.schools],
  );

  const atCap = selectedIds.size >= maxSelected;
  const allVisibleSelected =
    results.length > 0 &&
    results.every((student) => selectedIds.has(student.id));

  function handleToggleAll(checked: boolean): void {
    results.forEach((student) => {
      const option: RiskChildOption = {
        id: student.id,
        name: student.name,
        school: student.school_name ?? "",
      };
      if (checked !== selectedIds.has(student.id)) {
        onToggle(option, checked);
      }
    });
  }

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
              ...area.subDistricts.map((name) => ({
                value: name,
                label: name,
              })),
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
            value={
              area.schools.find((s) => String(s.id) === scope.schoolId)?.name ??
              ""
            }
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
              area.setAreaFromSchool(
                area.schools.find((s) => String(s.id) === next),
              );
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
            ...scope.gradeLevels.map((grade) => ({
              value: grade.label,
              label: grade.label,
            })),
          ]}
          placeholder="ค้นหาชั้น"
          value={scope.grade}
        />
        <Combobox
          disabled={disabled || !scope.grade || scope.roomLocked}
          onChange={(next) => scope.setRoom(next)}
          options={[
            { value: "", label: "ทุกห้อง" },
            ...scope.rooms.map(toRoomOption),
          ]}
          placeholder="ค้นหาห้อง"
          value={scope.room}
        />
      </div>

      <div className="max-w-[200px]">
        <Combobox
          disabled={disabled}
          onChange={(next) => setRiskTier(next as typeof riskTier)}
          options={[...STUDENT_RISK_TIER_FILTER_OPTIONS]}
          searchable={false}
          value={riskTier}
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
          เลือกครบ {maxSelected} คนแล้ว —
          เอาคนที่เลือกไว้ออกก่อนถึงจะเลือกเพิ่มได้
        </p>
      ) : null}

      {studentsQuery.isLoading ? (
        <p className="text-sm text-slate-500">กำลังโหลดรายชื่อ...</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-slate-500">ไม่พบนักเรียนตามที่ค้นหา</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
            <Checkbox
              aria-label="เลือกทั้งหมดในรายการนี้"
              checked={allVisibleSelected}
              disabled={disabled}
              onChange={(event) => handleToggleAll(event.currentTarget.checked)}
            />
            <span className="text-sm font-medium text-slate-700">
              เลือกทั้งหมดในรายการนี้
            </span>
          </div>
          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
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
                    <UserRound
                      className="size-4 shrink-0 text-slate-500"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800">
                        {student.name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {student.school_name ?? "-"} · {student.grade}/
                        {formatRoomLabel(student.room)}
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
