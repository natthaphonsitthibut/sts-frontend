import { HeartHandshake } from "lucide-react";
import {
  CountBadge,
  FilterSelect,
  PageToolbar,
  SearchInput,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { CASE_STATUS_META, CASE_STATUS_ORDER } from "../lib/case-presentation";

interface CaseListFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  count: number;
  onRefresh: () => Promise<unknown> | unknown;
}

export function CaseListFilter({
  searchQuery,
  onSearchChange,
  status,
  onStatusChange,
  count,
  onRefresh,
}: CaseListFilterProps) {
  return (
    <PageToolbar
      icon={HeartHandshake}
      title="เคสช่วยเหลือนักเรียน"
      description="ติดตามและอัปเดตสถานะเคสช่วยเหลือนักเรียน"
      actions={<RefreshButton onRefresh={onRefresh} />}
    >
      <ToolbarControls>
        <SearchInput
          onChange={onSearchChange}
          placeholder="ค้นหาชื่อนักเรียน..."
          value={searchQuery}
        />

        <FilterSelect
          ariaLabel="กรองตามสถานะ"
          onChange={onStatusChange}
          value={status}
        >
          <option value="ALL">ทั้งหมด</option>
          {CASE_STATUS_ORDER.map((value) => (
            <option key={value} value={value}>
              {CASE_STATUS_META[value].label}
            </option>
          ))}
        </FilterSelect>

        <CountBadge>{count} เคส</CountBadge>
      </ToolbarControls>
    </PageToolbar>
  );
}
