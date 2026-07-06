import type { ReactNode } from "react";
import { Users } from "lucide-react";
import {
  FilterSelect,
  ListPageToolbar,
} from "../../../components/layout/page-primitives";
import { RefreshButton } from "../../../components/layout/refresh-button";
import type { StudentStatusFilterValue } from "../types/students.types";

export interface StudentStatusFilterOption {
  value: StudentStatusFilterValue;
  label: string;
}

interface StudentSearchFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  grade: string;
  onGradeChange: (value: string) => void;
  gradeOptions: string[];
  room: string;
  onRoomChange: (value: string) => void;
  roomOptions: string[];
  studentStatusCode: StudentStatusFilterValue;
  onStudentStatusCodeChange: (value: StudentStatusFilterValue) => void;
  studentStatusOptions: StudentStatusFilterOption[];
  isStudentStatusLoading?: boolean;
  schoolFilters?: ReactNode;
  actions?: ReactNode;
  exportAction?: ReactNode;
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
  studentStatusCode,
  onStudentStatusCodeChange,
  studentStatusOptions,
  isStudentStatusLoading = false,
  schoolFilters,
  actions,
  exportAction,
  count,
  onRefresh,
}: StudentSearchFilterProps) {
  return (
    <ListPageToolbar
      icon={Users}
      title="รายชื่อนักเรียน"
      description="ค้นหาและดูข้อมูลนักเรียนตามระดับชั้นและห้อง"
      actions={actions}
      tableActions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <RefreshButton onRefresh={onRefresh} />
          {exportAction}
        </div>
      }
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

          <FilterSelect
            ariaLabel="กรองตามสถานะการเรียน"
            onChange={(value) => onStudentStatusCodeChange(value as StudentStatusFilterValue)}
            value={studentStatusCode}
          >
            {isStudentStatusLoading && studentStatusOptions.length === 0 ? (
              <option value={studentStatusCode}>กำลังโหลดสถานะ...</option>
            ) : null}
            {studentStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>
        </>
      }
      count={{ value: `${count} คน`, icon: Users }}
    />
  );
}
