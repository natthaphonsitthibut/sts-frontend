import type { ReactNode } from "react";
import { HeartHandshake } from "lucide-react";
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
  count: number;
  onRefresh: () => Promise<unknown> | unknown;
  statuses: readonly StatusCatalogItem[];
}

export function CaseListFilter({
  searchQuery,
  onSearchChange,
  status,
  onStatusChange,
  schoolFilters,
  count,
  onRefresh,
  statuses,
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
            {statuses.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </FilterSelect>
        </>
      }
      count={{ value: `${count} เคส` }}
    />
  );
}
