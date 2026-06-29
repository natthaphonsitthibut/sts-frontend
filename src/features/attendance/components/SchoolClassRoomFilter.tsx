import { Combobox } from "../../../components/base";
import { useSchoolAreaFilter } from "../hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../hooks/useScopeCascade";
import { SchoolAreaSchoolFilter } from "./SchoolAreaSchoolFilter";

type SchoolClassRoomScope = Pick<
  ReturnType<typeof useScopeCascade>,
  | "grade"
  | "gradeLevels"
  | "gradeLocked"
  | "room"
  | "roomLocked"
  | "rooms"
  | "schoolId"
  | "schoolLocked"
>;

interface SchoolClassRoomFilterProps {
  area: ReturnType<typeof useSchoolAreaFilter>;
  scope: SchoolClassRoomScope;
  onSchoolChange: (value: string) => void;
  onGradeChange: (value: string) => void;
  onRoomChange: (value: string) => void;
  disabled?: boolean;
}

export function SchoolClassRoomFilter({
  area,
  disabled,
  onGradeChange,
  onRoomChange,
  onSchoolChange,
  scope,
}: SchoolClassRoomFilterProps) {
  return (
    <>
      <SchoolAreaSchoolFilter
        area={area}
        disabled={disabled}
        onSchoolChange={onSchoolChange}
        schoolId={scope.schoolId}
        schoolLocked={scope.schoolLocked}
      />
      <Combobox
        disabled={disabled || !scope.schoolId || scope.gradeLocked}
        onChange={onGradeChange}
        options={[
          { value: "", label: scope.schoolId ? "ทุกชั้น" : "เลือกโรงเรียนก่อน" },
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
        onChange={onRoomChange}
        options={[
          { value: "", label: scope.grade ? "ทุกห้อง" : "เลือกชั้นก่อน" },
          ...scope.rooms.map((room) => ({ value: room, label: `ห้อง ${room}` })),
        ]}
        placeholder="ค้นหาห้อง"
        value={scope.room}
      />
    </>
  );
}
