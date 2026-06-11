import { Users } from "lucide-react";
import {
  CountBadge,
  FilterSelect,
  PageToolbar,
  SearchInput,
  ToolbarControls,
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
  count,
  onRefresh,
}: StudentSearchFilterProps) {
  return (
    <PageToolbar
      icon={Users}
      title="รายชื่อนักเรียน"
      description="ค้นหาและดูข้อมูลนักเรียนตามระดับชั้นและห้อง"
      actions={<RefreshButton onRefresh={onRefresh} />}
    >
      <ToolbarControls>
        <SearchInput
          onChange={onSearchChange}
          placeholder="ค้นหาชื่อหรือรหัส..."
          value={searchQuery}
        />

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

        <CountBadge icon={Users}>{count} คน</CountBadge>
      </ToolbarControls>
    </PageToolbar>
  );
}
