import { Combobox } from "../../../components/base";
import { toRoomOption } from "../../../lib/room-presentation";
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
  emptyOptionLabels?: {
    school?: string;
    grade?: string;
    room?: string;
  };
}

export function SchoolClassRoomFilter({
  area,
  disabled,
  emptyOptionLabels,
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
        schoolEmptyLabel={emptyOptionLabels?.school}
        schoolId={scope.schoolId}
        schoolLocked={scope.schoolLocked}
        hideArea={scope.schoolLocked}
        hideSchool={scope.schoolLocked}
      />
      <Combobox
        disabled={disabled || !scope.schoolId || scope.gradeLocked}
        onChange={onGradeChange}
        options={[
          { value: "", label: emptyOptionLabels?.grade ?? "ทุกชั้น" },
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
          { value: "", label: emptyOptionLabels?.room ?? "ทุกห้อง" },
          ...scope.rooms.map(toRoomOption),
        ]}
        placeholder="ค้นหาห้อง"
        value={scope.room}
      />
    </>
  );
}
