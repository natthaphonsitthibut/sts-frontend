import type { ReactNode } from "react";
import { Users } from "lucide-react";
import {
  FilterSelect,
  ListPageToolbar,
} from "../../../components/layout/page-primitives";
import { RefreshButton } from "../../../components/layout/refresh-button";

interface StudentSearchFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  grade: string;
  onGradeChange: (value: string) => void;
  gradeOptions: string[];
  room: string;
  onRoomChange: (value: string) => void;
  roomOptions: string[];
  schoolFilters?: ReactNode;
  count: number;
  onRefresh: () => Promise<unknown> | unknown;
}

export function StudentSearchFilter({
  searchQuery,
  onSearchChange,
  grade,
  onGradeChange,
  gradeOptions,
  room,
  onRoomChange,
  roomOptions,
  schoolFilters,
  count,
  onRefresh,
}: StudentSearchFilterProps) {
  return (
    <ListPageToolbar
      icon={Users}
      title="รายชื่อนักเรียน"
      description="ค้นหาและดูข้อมูลนักเรียนตามระดับชั้นและห้อง"
      tableActions={<RefreshButton onRefresh={onRefresh} />}
      search={{
        value: searchQuery,
        onChange: onSearchChange,
        placeholder: "ค้นหาชื่อนักเรียน...",
      }}
      filters={
        <>
          {schoolFilters}

          <FilterSelect
            ariaLabel="กรองตามระดับชั้น"
            onChange={onGradeChange}
            value={grade}
          >
            <option value="ALL">ทุกระดับชั้น</option>
            {gradeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            ariaLabel="กรองตามห้อง"
            onChange={onRoomChange}
            value={room}
          >
            <option value="ALL">ทุกห้อง</option>
            {roomOptions.map((option) => (
              <option key={option} value={option}>
                ห้อง {option}
              </option>
            ))}
          </FilterSelect>
        </>
      }
      count={{ value: `${count} คน`, icon: Users }}
    />
  );
}
