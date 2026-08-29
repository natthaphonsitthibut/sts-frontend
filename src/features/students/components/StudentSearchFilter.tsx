import type { ReactNode } from "react";
import { Users } from "lucide-react";
import {
  FilterSelect,
  ListPageToolbar,
} from "../../../components/layout/page-primitives";
import { formatRoomLabel } from "../../../lib/room-presentation";
import { Select } from "../../../components/base";
import type { StudentStatusFilterValue } from "../types/students.types";
import {
  SCOPE_ALL_LABEL,
  type ScopeSummaryInput,
} from "../../../lib/scope-presentation";
import { ScopeFilterField } from "../../attendance/components/ScopeFilterField";

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
  /** The scope in force, for the header summary. */
  scope: ScopeSummaryInput;
  /** False when the actor's own data scope fixes school, grade and room. */
  scopeEditable?: boolean;
  onClearScope?: () => void;
  navigation?: ReactNode;
  exportAction?: ReactNode;
  createAction?: ReactNode;
  onClearFilters: () => void;
  title?: string;
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
  scope,
  scopeEditable = true,
  onClearScope,
  navigation,
  exportAction,
  createAction,
  onClearFilters,
  title = "รายชื่อนักเรียน",
}: StudentSearchFilterProps) {
  return (
    <ListPageToolbar
      icon={Users}
      title={title}
      description="ค้นหาและดูข้อมูลนักเรียนตามระดับชั้นและห้อง"
      navigation={navigation}
      tableActions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {exportAction}
          {createAction}
        </div>
      }
      search={{
        value: searchQuery,
        onChange: onSearchChange,
        placeholder: "ค้นหาชื่อนักเรียน...",
        after: (
          <FilterSelect
            ariaLabel="กรองตามสถานะการเรียน"
            className="sm:w-[220px]"
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
        ),
      }}
      scope={
        <ScopeFilterField
          editable={scopeEditable}
          onClear={onClearScope ?? onClearFilters}
          scope={scope}
        >
          {schoolFilters}

          <Select
            aria-label="กรองตามระดับชั้น"
            disabled={gradeLocked}
            onChange={(event) => onGradeChange(event.target.value)}
            value={grade}
          >
            <option value="ALL">{SCOPE_ALL_LABEL.grade}</option>
            {gradeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>

          <Select
            aria-label="กรองตามห้อง"
            disabled={roomLocked}
            onChange={(event) => onRoomChange(event.target.value)}
            value={room}
          >
            <option value="ALL">{SCOPE_ALL_LABEL.room}</option>
            {roomOptions.map((option) => (
              <option key={option} value={option}>
                {formatRoomLabel(option)}
              </option>
            ))}
          </Select>
        </ScopeFilterField>
      }
    />
  );
}
