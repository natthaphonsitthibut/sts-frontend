import { DatePicker, Select } from "../../../components/base";
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
  onSchoolChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  province: string;
  provinces: ExecutiveReportingOption[];
  schoolId: string;
  schools: ExecutiveReportingOption[];
  toDate: string;
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          aria-label="จัดกลุ่มผลลัพธ์"
          id="executive-group-by"
          onChange={(event) =>
            onGroupByChange(event.target.value as ExecutiveReportingGroup)
          }
          value={groupBy}
        >
          <option value="PROVINCE">จัดกลุ่มตามจังหวัด</option>
          <option disabled={!province} value="DISTRICT">
            จัดกลุ่มตามอำเภอ
          </option>
          <option disabled={!province} value="SCHOOL">
            จัดกลุ่มตามโรงเรียน
          </option>
        </Select>

        <Select
          aria-label="กรองตามจังหวัด"
          id="executive-province"
          onChange={(event) => onProvinceChange(event.target.value)}
          value={province}
        >
          <option value="">ทุกจังหวัด</option>
          {provinces.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Select
          aria-label="กรองตามอำเภอ"
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

        <Select
          aria-label="กรองตามโรงเรียน"
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

        <DatePicker
          ariaLabel="ตั้งแต่วันที่"
          max={toDate || undefined}
          onChange={onFromDateChange}
          placeholder="ตั้งแต่วันที่"
          value={fromDate}
        />
        <DatePicker
          ariaLabel="ถึงวันที่"
          min={fromDate || undefined}
          onChange={onToDateChange}
          placeholder="ถึงวันที่"
          value={toDate}
        />
      </div>
    </div>
  );
}
