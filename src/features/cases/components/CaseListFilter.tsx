import type { ReactNode } from "react";
import { ClipboardList } from "lucide-react";
import {
  FilterSelect,
  ListPageToolbar,
} from "../../../components/layout/page-primitives";
import { RefreshButton } from "../../../components/layout/refresh-button";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";

interface CaseListFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  schoolFilters?: ReactNode;
  navigation?: ReactNode;
  exportAction?: ReactNode;
  onRefresh: () => Promise<unknown> | unknown;
  updatedAt: number;
  onClearFilters: () => void;
  statuses: readonly StatusCatalogItem[];
}

export function CaseListFilter({
  searchQuery,
  onSearchChange,
  status,
  onStatusChange,
  schoolFilters,
  navigation,
  exportAction,
  onRefresh,
  updatedAt,
  onClearFilters,
  statuses,
}: CaseListFilterProps) {
  return (
    <ListPageToolbar
      icon={ClipboardList}
      title="เคสติดตามนักเรียน"
      description="ติดตามรายงานแต่ละรอบจนปิดเคส"
      navigation={navigation}
      tableActions={
        <>
          <RefreshButton onRefresh={onRefresh} updatedAt={updatedAt} />
          {exportAction}
        </>
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
