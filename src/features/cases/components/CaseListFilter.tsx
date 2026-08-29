import type { ReactNode } from "react";
import { ClipboardList } from "lucide-react";
import {
  FilterSelect,
  ListPageToolbar,
} from "../../../components/layout/page-primitives";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";

interface CaseListFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  schoolFilters?: ReactNode;
  navigation?: ReactNode;
  exportAction?: ReactNode;
  onClearFilters: () => void;
  statuses: readonly StatusCatalogItem[];
  showStatusFilter?: boolean;
}

export function CaseListFilter({
  searchQuery,
  onSearchChange,
  status,
  onStatusChange,
  schoolFilters,
  navigation,
  exportAction,
  onClearFilters,
  statuses,
  showStatusFilter = true,
}: CaseListFilterProps) {
  return (
    <ListPageToolbar
      icon={ClipboardList}
      title="เคสติดตามนักเรียน"
      description="ติดตามรายงานแต่ละรอบจนปิดเคส"
      navigation={navigation}
      tableActions={<>{exportAction}</>}
      onClearFilters={onClearFilters}
      search={{
        value: searchQuery,
        onChange: onSearchChange,
        placeholder: "ค้นหาชื่อนักเรียน...",
      }}
      filters={
        <>
          {schoolFilters}
          {showStatusFilter ? (
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
          ) : null}
        </>
      }
    />
  );
}
