import { Combobox, type ComboboxOption } from "../../../components/base";
import { useSchoolAreaFilter } from "../hooks/useSchoolAreaFilter";

interface SchoolAreaSchoolFilterProps {
  area: ReturnType<typeof useSchoolAreaFilter>;
  schoolId: string;
  onSchoolChange: (value: string) => void;
  schoolLocked?: boolean;
  disabled?: boolean;
  schoolPlaceholder?: string;
  schoolEmptyText?: string;
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
  onSchoolChange,
  schoolEmptyText,
  schoolId,
  schoolLocked = false,
  schoolPlaceholder = "ค้นหาโรงเรียน",
}: SchoolAreaSchoolFilterProps) {
  function clearSchool(): void {
    onSchoolChange("");
  }

  function selectSchool(nextSchoolId: string): void {
    onSchoolChange(nextSchoolId);
    const school = area.filteredSchools.find(
      (candidate) => String(candidate.id) === nextSchoolId,
    );
    area.setAreaFromSchool(school);
  }

  return (
    <>
      <Combobox
        disabled={disabled || schoolLocked}
        onChange={(next) => {
          area.setProvince(next);
          clearSchool();
        }}
        options={toOptions(area.provinces, "ทุกจังหวัด")}
        placeholder="ค้นหาจังหวัด"
        value={area.province}
      />
      <Combobox
        disabled={disabled || schoolLocked || !area.province}
        onChange={(next) => {
          area.setDistrict(next);
          clearSchool();
        }}
        options={toOptions(area.districts, "ทุกอำเภอ/เขต")}
        placeholder="ค้นหาอำเภอ/เขต"
        value={area.district}
      />
      <Combobox
        disabled={disabled || schoolLocked || !area.district}
        onChange={(next) => {
          area.setSubDistrict(next);
          clearSchool();
        }}
        options={toOptions(area.subDistricts, "ทุกตำบล/แขวง")}
        placeholder="ค้นหาตำบล/แขวง"
        value={area.subDistrict}
      />
      <Combobox
        disabled={disabled || schoolLocked}
        emptyText={
          schoolEmptyText ??
          (area.schoolsEnabled
            ? "ไม่พบโรงเรียน"
            : "พิมพ์ชื่อโรงเรียน หรือเลือกจังหวัด/อำเภอ/เขต/ตำบล/แขวง")
        }
        onChange={selectSchool}
        onSearchChange={area.setSchoolSearch}
        options={[
          { value: "", label: "ทุกโรงเรียน" },
          ...area.filteredSchools.map((school) => ({
            value: String(school.id),
            label: school.name,
          })),
        ]}
        placeholder={schoolPlaceholder}
        value={schoolId}
      />
    </>
  );
}
