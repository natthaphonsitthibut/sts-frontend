import { Combobox, type ComboboxOption } from "../../../components/base";
import {
  SCOPE_ALL_LABEL,
  formatSchoolArea,
} from "../../../lib/scope-presentation";
import { useSchoolAreaFilter } from "../hooks/useSchoolAreaFilter";

interface SchoolAreaSchoolFilterProps {
  area: ReturnType<typeof useSchoolAreaFilter>;
  schoolId?: string;
  onSchoolChange?: (value: string) => void;
  onProvinceChange?: (value: string) => void;
  onDistrictChange?: (value: string) => void;
  onSubDistrictChange?: (value: string) => void;
  selectedSchoolFallback?: {
    id: number | string;
    name: string | null | undefined;
  };
  schoolLocked?: boolean;
  disabled?: boolean;
  schoolPlaceholder?: string;
  schoolInputId?: string;
  schoolEmptyText?: string;
  schoolEmptyLabel?: string;
  /** Hide the geographical cascade together with the school selector. */
  hideArea?: boolean;
  hideSchool?: boolean;
}

/**
 * A level with one value or none is not a choice — the single value is already
 * implied by the actor's own scope, and rendering it just adds a control that
 * can only be set to what is true anyway. Hidden levels stay unset, which the
 * school query reads as "no narrowing here", so results are unaffected.
 */
function offersAChoice(values: string[]): boolean {
  return values.length > 1;
}

function toOptions(values: string[], emptyLabel: string): ComboboxOption[] {
  return [
    { value: "", label: emptyLabel },
    ...values.map((value) => ({ value, label: value })),
  ];
}

export function SchoolAreaSchoolFilter({
  area,
  disabled,
  onDistrictChange,
  onProvinceChange,
  onSchoolChange,
  onSubDistrictChange,
  selectedSchoolFallback,
  schoolEmptyLabel = SCOPE_ALL_LABEL.school,
  schoolEmptyText,
  schoolId,
  schoolLocked = false,
  schoolPlaceholder = "ค้นหาโรงเรียน",
  schoolInputId,
  hideArea = false,
  hideSchool = false,
}: SchoolAreaSchoolFilterProps) {
  function clearSchool(): void {
    onSchoolChange?.("");
  }

  function selectSchool(nextSchoolId: string): void {
    onSchoolChange?.(nextSchoolId);
    const school = area.filteredSchools.find(
      (candidate) => String(candidate.id) === nextSchoolId,
    );
    area.setAreaFromSchool(school);
    onProvinceChange?.(school?.province ?? "");
    onDistrictChange?.(school?.district ?? "");
    onSubDistrictChange?.(school?.sub_district ?? "");
  }

  const selectedFallbackLabel = selectedSchoolFallback?.name?.trim();
  const selectedFallbackOption =
    selectedFallbackLabel &&
    schoolId &&
    selectedSchoolFallback &&
    String(selectedSchoolFallback.id) === schoolId &&
    !area.filteredSchools.some((school) => String(school.id) === schoolId)
      ? {
          value: schoolId,
          label: selectedFallbackLabel,
        }
      : null;

  // A level the actor cannot move within is not shown at all — a greyed-out
  // control still takes a row and still invites a click that does nothing. A
  // locked school fixes its province, district and sub-district too, so those
  // go with it; what remains on screen is exactly what this account can narrow.
  const showArea = !hideArea && !schoolLocked;
  const showSchool = !hideSchool && !schoolLocked;

  return (
    <>
      {showArea && offersAChoice(area.provinces) ? (
        <Combobox
          disabled={disabled}
          onChange={(next) => {
            area.setProvince(next);
            onProvinceChange?.(next);
            onDistrictChange?.("");
            onSubDistrictChange?.("");
            clearSchool();
          }}
          options={toOptions(area.provinces, SCOPE_ALL_LABEL.province)}
          placeholder="ค้นหาจังหวัด"
          value={area.province}
        />
      ) : null}
      {showArea && offersAChoice(area.districts) ? (
        <Combobox
          disabled={
            disabled || (offersAChoice(area.provinces) && !area.province)
          }
          onChange={(next) => {
            area.setDistrict(next);
            onDistrictChange?.(next);
            onSubDistrictChange?.("");
            clearSchool();
          }}
          options={toOptions(area.districts, SCOPE_ALL_LABEL.district)}
          placeholder="ค้นหาอำเภอ/เขต"
          value={area.district}
        />
      ) : null}
      {showArea && offersAChoice(area.subDistricts) ? (
        <Combobox
          disabled={
            disabled || (offersAChoice(area.districts) && !area.district)
          }
          onChange={(next) => {
            area.setSubDistrict(next);
            onSubDistrictChange?.(next);
            clearSchool();
          }}
          options={toOptions(area.subDistricts, SCOPE_ALL_LABEL.subDistrict)}
          placeholder="ค้นหาตำบล/แขวง"
          value={area.subDistrict}
        />
      ) : null}
      {showSchool ? (
        <Combobox
          ariaLabel={schoolPlaceholder}
          disabled={disabled}
          emptyText={
            schoolEmptyText ??
            (area.schoolsEnabled
              ? "ไม่พบโรงเรียน"
              : "พิมพ์ชื่อโรงเรียน หรือเลือกจังหวัด/อำเภอ/เขต/ตำบล/แขวง")
          }
          id={schoolInputId}
          onChange={selectSchool}
          onSearchChange={area.setSchoolSearch}
          options={[
            { value: "", label: schoolEmptyLabel },
            ...(selectedFallbackOption ? [selectedFallbackOption] : []),
            ...area.filteredSchools.map((school) => ({
              value: String(school.id),
              label: school.name,
              description: formatSchoolArea(school),
            })),
          ]}
          placeholder={schoolPlaceholder}
          value={schoolId ?? ""}
        />
      ) : null}
    </>
  );
}
