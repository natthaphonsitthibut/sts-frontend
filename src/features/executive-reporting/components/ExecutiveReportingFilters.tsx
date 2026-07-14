import { RotateCcw } from "lucide-react";
import { Button, Input, Label, Select } from "../../../components/base";
import type {
  ExecutiveReportingGroup,
  ExecutiveReportingOption,
} from "../types/executive-reporting.types";

interface ExecutiveReportingFiltersProps {
  district: string;
  districts: ExecutiveReportingOption[];
  fromDate: string;
  groupBy: ExecutiveReportingGroup;
  isFetchingOptions: boolean;
  onDistrictChange: (value: string) => void;
  onFromDateChange: (value: string) => void;
  onGroupByChange: (value: ExecutiveReportingGroup) => void;
  onProvinceChange: (value: string) => void;
  onReset: () => void;
  onSchoolChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  province: string;
  provinces: ExecutiveReportingOption[];
  schoolId: string;
  schools: ExecutiveReportingOption[];
  toDate: string;
}

function FilterField({
  children,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function ExecutiveReportingFilters({
  district,
  districts,
  fromDate,
  groupBy,
  isFetchingOptions,
  onDistrictChange,
  onFromDateChange,
  onGroupByChange,
  onProvinceChange,
  onReset,
  onSchoolChange,
  onToDateChange,
  province,
  provinces,
  schoolId,
  schools,
  toDate,
}: ExecutiveReportingFiltersProps) {
  return (
    <div aria-busy={isFetchingOptions}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <FilterField htmlFor="executive-group-by" label="จัดกลุ่มผลลัพธ์">
          <Select
            id="executive-group-by"
            onChange={(event) =>
              onGroupByChange(event.target.value as ExecutiveReportingGroup)
            }
            value={groupBy}
          >
            <option value="PROVINCE">จังหวัด</option>
            <option disabled={!province} value="DISTRICT">
              อำเภอ
            </option>
            <option disabled={!province} value="SCHOOL">
              โรงเรียน
            </option>
          </Select>
        </FilterField>

        <FilterField htmlFor="executive-province" label="จังหวัด">
          <Select
            id="executive-province"
            onChange={(event) => onProvinceChange(event.target.value)}
            value={province}
          >
            <option value="">ทุกจังหวัดในขอบเขต</option>
            {provinces.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FilterField>

        <FilterField htmlFor="executive-district" label="อำเภอ">
          <Select
            disabled={!province}
            id="executive-district"
            onChange={(event) => onDistrictChange(event.target.value)}
            value={district}
          >
            <option value="">ทุกอำเภอ</option>
            {districts.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FilterField>

        <FilterField htmlFor="executive-school" label="โรงเรียน">
          <Select
            disabled={!district}
            id="executive-school"
            onChange={(event) => onSchoolChange(event.target.value)}
            value={schoolId}
          >
            <option value="">ทุกโรงเรียน</option>
            {schools.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FilterField>

        <FilterField htmlFor="executive-from" label="ตั้งแต่วันที่">
          <Input
            id="executive-from"
            max={toDate || undefined}
            onChange={(event) => onFromDateChange(event.target.value)}
            type="date"
            value={fromDate}
          />
        </FilterField>

        <FilterField htmlFor="executive-to" label="ถึงวันที่">
          <Input
            id="executive-to"
            min={fromDate || undefined}
            onChange={(event) => onToDateChange(event.target.value)}
            type="date"
            value={toDate}
          />
        </FilterField>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <p className="text-xs text-slate-500">
          ตัวกรองทั้งหมดถูกตรวจสิทธิ์ซ้ำที่ backend
        </p>
        <Button icon={RotateCcw} onClick={onReset} size="sm" variant="outline">
          ล้างตัวกรอง
        </Button>
      </div>
    </div>
  );
}
