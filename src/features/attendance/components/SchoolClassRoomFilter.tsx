import {
  FilterCombobox,
  FilterSelect,
} from "../../../components/layout/page-primitives";
import { formatRoomLabel } from "../../../lib/room-presentation";
import {
  SCOPE_ALL_LABEL,
  SCOPE_REQUIRED_LABEL,
  formatSchoolArea,
} from "../../../lib/scope-presentation";
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
  /**
   * The attendance workspace has no need for a geographic cascade: its school
   * list is already scope-limited by the lookup API. Use the same compact
   * school combobox as the teacher-link management page instead.
   */
  schoolSelector?: "area-cascade" | "scope-combobox";
}

export function SchoolClassRoomFilter({
  area,
  disabled,
  emptyOptionLabels,
  onGradeChange,
  onRoomChange,
  onSchoolChange,
  schoolSelector = "area-cascade",
  scope,
}: SchoolClassRoomFilterProps) {
  const showScopeSchoolSelector =
    schoolSelector === "scope-combobox" &&
    !scope.schoolLocked &&
    area.filteredSchools.length > 1;

  return (
    <>
      {schoolSelector === "area-cascade" ? (
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
      ) : showScopeSchoolSelector ? (
        <FilterCombobox
          ariaLabel="กรองตามโรงเรียน"
          disabled={disabled}
          emptyText="ไม่พบโรงเรียนในขอบเขตสิทธิ์"
          onChange={onSchoolChange}
          options={area.filteredSchools.map((school) => ({
            value: String(school.id),
            label: school.name,
            description: formatSchoolArea(school),
          }))}
          placeholder={emptyOptionLabels?.school ?? SCOPE_REQUIRED_LABEL.school}
          value={scope.schoolId}
        />
      ) : null}
      {!scope.gradeLocked ? (
        <FilterSelect
          ariaLabel="กรองตามระดับชั้น"
          disabled={disabled || !scope.schoolId}
          onChange={onGradeChange}
          value={scope.grade}
        >
          <option value="">
            {emptyOptionLabels?.grade ?? SCOPE_ALL_LABEL.grade}
          </option>
          {scope.gradeLevels.map((grade) => (
            <option key={grade.id} value={grade.label}>
              {grade.label}
            </option>
          ))}
        </FilterSelect>
      ) : null}
      {!scope.roomLocked ? (
        <FilterSelect
          ariaLabel="กรองตามห้อง"
          disabled={disabled || !scope.grade}
          onChange={onRoomChange}
          value={scope.room}
        >
          <option value="">
            {emptyOptionLabels?.room ?? SCOPE_ALL_LABEL.room}
          </option>
          {scope.rooms.map((room) => (
            <option key={room} value={room}>
              {formatRoomLabel(room)}
            </option>
          ))}
        </FilterSelect>
      ) : null}
    </>
  );
}
