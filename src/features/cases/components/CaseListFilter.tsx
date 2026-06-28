import type { ReactNode } from "react";
import { HeartHandshake } from "lucide-react";
import {
  FilterSelect,
  ListPageToolbar,
} from "../../../components/layout/page-primitives";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { CASE_STATUS_META, CASE_STATUS_ORDER } from "../lib/case-presentation";

interface CaseListFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  schoolFilters?: ReactNode;
  count: number;
  onRefresh: () => Promise<unknown> | unknown;
}

export function CaseListFilter({
  searchQuery,
  onSearchChange,
  status,
  onStatusChange,
  schoolFilters,
  count,
  onRefresh,
}: CaseListFilterProps) {
  return (
    <ListPageToolbar
      icon={HeartHandshake}
      title="เคสช่วยเหลือนักเรียน"
      description="ติดตามและอัปเดตสถานะเคสช่วยเหลือนักเรียน"
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
        </>
      }
      count={{ value: `${count} เคส` }}
    />
  );
}
