import type { ReactNode } from "react";
import { Users } from "lucide-react";
import {
  FilterSelect,
  ListPageToolbar,
} from "../../../components/layout/page-primitives";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { formatRoomLabel } from "../../../lib/room-presentation";
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
  isStudentStatusError?: boolean;
  isStudentStatusLoading?: boolean;
  schoolFilters?: ReactNode;
  navigation?: ReactNode;
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
  isStudentStatusError = false,
  isStudentStatusLoading = false,
  schoolFilters,
  navigation,
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
      navigation={navigation}
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

          <FilterSelect
            ariaLabel="กรองตามระดับชั้น"
            disabled={gradeLocked}
            onChange={onGradeChange}
            value={grade}
          >
            <option value="ALL">ทุกชั้น</option>
            {gradeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            ariaLabel="กรองตามห้อง"
            disabled={roomLocked}
            onChange={onRoomChange}
            value={room}
          >
            <option value="ALL">ทุกห้อง</option>
            {roomOptions.map((option) => (
              <option key={option} value={option}>
                {formatRoomLabel(option)}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            ariaLabel="กรองตามสถานะการเรียน"
            disabled={isStudentStatusError || isStudentStatusLoading}
            onChange={(value) =>
              onStudentStatusCodeChange(value as StudentStatusFilterValue)
            }
            value={studentStatusCode}
          >
            {isStudentStatusError ? (
              <option value={studentStatusCode}>โหลดสถานะไม่สำเร็จ</option>
            ) : isStudentStatusLoading ? (
              <option value={studentStatusCode}>กำลังโหลดสถานะ...</option>
            ) : null}
            {isStudentStatusError || isStudentStatusLoading
              ? null
              : studentStatusOptions.map((option) => (
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
