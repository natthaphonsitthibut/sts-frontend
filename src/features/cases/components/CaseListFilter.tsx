import type { ReactNode } from "react";
import { HeartHandshake } from "lucide-react";
import {
  FilterSelect,
  ListPageToolbar,
} from "../../../components/layout/page-primitives";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { ClearFiltersButton } from "../../../components/layout/clear-filters-button";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";

interface CaseListFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  schoolFilters?: ReactNode;
  actions?: ReactNode;
  exportAction?: ReactNode;
  onRefresh: () => Promise<unknown> | unknown;
  onClearFilters: () => void;
  statuses: readonly StatusCatalogItem[];
}

export function CaseListFilter({
  searchQuery,
  onSearchChange,
  status,
  onStatusChange,
  schoolFilters,
  actions,
  exportAction,
  onRefresh,
  onClearFilters,
  statuses,
}: CaseListFilterProps) {
  return (
    <ListPageToolbar
      icon={HeartHandshake}
      title="เคสช่วยเหลือนักเรียน"
      description="ติดตามและอัปเดตสถานะเคสช่วยเหลือนักเรียน"
      actions={actions}
      tableActions={
        <>
          <RefreshButton onRefresh={onRefresh} />
          <ClearFiltersButton onClear={onClearFilters} />
          {exportAction}
        </>
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
            ariaLabel="กรองตามสถานะ"
            onChange={onStatusChange}
            value={status}
          >
            <option value="ALL">ทั้งหมด</option>
            {statuses.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </FilterSelect>
        </>
      }
    />
  );
}
