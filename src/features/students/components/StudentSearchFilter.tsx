import type { ReactNode } from "react";
import { Users } from "lucide-react";
import {
  FilterSelect,
  ListPageToolbar,
} from "../../../components/layout/page-primitives";
import { RefreshButton } from "../../../components/layout/refresh-button";
import type { StudentEnrollmentState } from "../types/students.types";

interface StudentSearchFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  grade: string;
  onGradeChange: (value: string) => void;
  gradeOptions: string[];
  room: string;
  onRoomChange: (value: string) => void;
  roomOptions: string[];
  enrollmentState: StudentEnrollmentState;
  onEnrollmentStateChange: (value: StudentEnrollmentState) => void;
  schoolFilters?: ReactNode;
  actions?: ReactNode;
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
  enrollmentState,
  onEnrollmentStateChange,
  schoolFilters,
  actions,
  count,
  onRefresh,
}: StudentSearchFilterProps) {
  return (
    <ListPageToolbar
      icon={Users}
      title="รายชื่อนักเรียน"
      description="ค้นหาและดูข้อมูลนักเรียนตามระดับชั้นและห้อง"
      actions={actions}
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
            ariaLabel="กรองตามสถานะการเรียน"
            onChange={(value) => onEnrollmentStateChange(value as StudentEnrollmentState)}
            value={enrollmentState}
          >
            <option value="current-active">นักเรียนปัจจุบัน</option>
            <option value="all">ทุกสถานะ</option>
          </FilterSelect>

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
