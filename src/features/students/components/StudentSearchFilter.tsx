import type { ReactNode } from "react";
import { Users } from "lucide-react";
import {
  FilterCombobox,
  FilterSelect,
  ListPageToolbar,
} from "../../../components/layout/page-primitives";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { toRoomOption } from "../../../lib/room-presentation";
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
  gradeLocked?: boolean;
  room: string;
  onRoomChange: (value: string) => void;
  roomOptions: string[];
  roomLocked?: boolean;
  studentStatusCode: StudentStatusFilterValue;
  onStudentStatusCodeChange: (value: StudentStatusFilterValue) => void;
  studentStatusOptions: StudentStatusFilterOption[];
  isStudentStatusLoading?: boolean;
  schoolFilters?: ReactNode;
  actions?: ReactNode;
  exportAction?: ReactNode;
  onRefresh: () => Promise<unknown> | unknown;
  updatedAt: number;
  onClearFilters: () => void;
}

export function StudentSearchFilter({
  searchQuery,
  onSearchChange,
  grade,
  onGradeChange,
  gradeOptions,
  gradeLocked = false,
  room,
  onRoomChange,
  roomOptions,
  roomLocked = false,
  studentStatusCode,
  onStudentStatusCodeChange,
  studentStatusOptions,
  isStudentStatusLoading = false,
  schoolFilters,
  actions,
  exportAction,
  onRefresh,
  updatedAt,
  onClearFilters,
}: StudentSearchFilterProps) {
  return (
    <ListPageToolbar
      icon={Users}
      title="รายชื่อนักเรียน"
      description="ค้นหาและดูข้อมูลนักเรียนตามระดับชั้นและห้อง"
      actions={actions}
      tableActions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <RefreshButton onRefresh={onRefresh} updatedAt={updatedAt} />
          {exportAction}
        </div>
      }
      onClearFilters={onClearFilters}
      search={{
        value: searchQuery,
        onChange: onSearchChange,
        placeholder: "ค้นหาชื่อนักเรียน...",
      }}
      filters={
        <>
          {schoolFilters}

          <FilterCombobox
            ariaLabel="กรองตามระดับชั้น"
            disabled={gradeLocked}
            onChange={onGradeChange}
            options={[
              { value: "ALL", label: "ทุกชั้น" },
              ...gradeOptions.map((option) => ({ value: option, label: option })),
            ]}
            placeholder="ค้นหาระดับชั้น"
            value={grade}
          />

          <FilterCombobox
            ariaLabel="กรองตามห้อง"
            disabled={roomLocked}
            onChange={onRoomChange}
            options={[
              { value: "ALL", label: "ทุกห้อง" },
              ...roomOptions.map(toRoomOption),
            ]}
            placeholder="ค้นหาห้อง"
            value={room}
          />

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
    />
  );
}
