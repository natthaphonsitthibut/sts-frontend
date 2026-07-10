import { Combobox } from "../../../components/base";
import { ToolbarFilterGrid } from "../../../components/layout/page-primitives";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";

export interface RoomSelection {
  schoolId: number;
  gradeLevelId: number;
  roomNo: number;
  schoolName: string;
}

interface RoomPickerProps {
  onChange: (selection: RoomSelection | null) => void;
}

/**
 * School → grade → room cascade for the timetable feature — thin wrapper
 * around the same `useScopeCascade`/`useSchoolAreaFilter` hooks the
 * attendance-link creation form uses, so scope locking behaves identically.
 */
export function RoomPicker({ onChange }: RoomPickerProps) {
  const area = useSchoolAreaFilter();
  const scope = useScopeCascade({ lockToActorScope: true });

  function emit(nextSchoolId: string, nextGradeLevelId: number | null, nextRoom: string): void {
    const schoolId = Number(nextSchoolId);
    const roomNo = Number(nextRoom);
    const school = area.schools.find((candidate) => String(candidate.id) === nextSchoolId);
    if (!schoolId || !nextGradeLevelId || !roomNo || !school) {
      onChange(null);
      return;
    }
    onChange({ schoolId, gradeLevelId: nextGradeLevelId, roomNo, schoolName: school.name });
  }

  return (
    <ToolbarFilterGrid>
      {scope.schoolLocked ? null : (
        <>
          <Combobox
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
            disabled={!area.province}
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
            disabled={!area.district}
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
        </>
      )}
      <Combobox
        disabled={scope.schoolLocked}
        emptyText={area.schoolsEnabled ? "ไม่พบโรงเรียน" : "พิมพ์ชื่อโรงเรียน หรือเลือกพื้นที่"}
        onChange={(next) => {
          scope.setSchoolId(next);
          const school = area.schools.find((candidate) => String(candidate.id) === next);
          area.setAreaFromSchool(school);
          emit(next, scope.gradeLevelId, scope.room);
        }}
        onSearchChange={area.setSchoolSearch}
        options={[
          { value: "", label: "เลือกโรงเรียน" },
          ...area.schools.map((school) => ({ value: String(school.id), label: school.name })),
        ]}
        placeholder="ค้นหาโรงเรียน"
        value={scope.schoolId}
      />
      <Combobox
        disabled={!scope.schoolId || scope.gradeLocked}
        onChange={(next) => {
          scope.setGrade(next);
          const gradeLevelId = scope.gradeLevels.find((level) => level.label === next)?.id ?? null;
          emit(scope.schoolId, gradeLevelId, scope.room);
        }}
        options={[
          { value: "", label: "เลือกชั้น" },
          ...scope.gradeLevels.map((grade) => ({ value: grade.label, label: grade.label })),
        ]}
        placeholder="ค้นหาชั้น"
        value={scope.grade}
      />
      <Combobox
        disabled={!scope.grade || scope.roomLocked}
        onChange={(next) => {
          scope.setRoom(next);
          emit(scope.schoolId, scope.gradeLevelId, next);
        }}
        options={[
          { value: "", label: "เลือกห้อง" },
          ...scope.rooms.map((room) => ({ value: room, label: `ห้อง ${room}` })),
        ]}
        placeholder="ค้นหาห้อง"
        value={scope.room}
      />
    </ToolbarFilterGrid>
  );
}
