import type { ReactNode } from "react";
import { UserCheck } from "lucide-react";
import {
  FilterSelect,
  ListPageToolbar,
} from "../../../components/layout/page-primitives";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { SchoolAreaSchoolFilter } from "../../attendance/components/SchoolAreaSchoolFilter";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";
import type { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";

interface FieldFollowerReviewFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  statusOptions: readonly StatusCatalogItem[];
  area: ReturnType<typeof useSchoolAreaFilter>;
  actions?: ReactNode;
  onRefresh: () => Promise<unknown> | unknown;
  onClearFilters: () => void;
  updatedAt: number;
}

export function FieldFollowerReviewFilter({
  searchQuery,
  onSearchChange,
  status,
  onStatusChange,
  statusOptions,
  area,
  actions,
  onRefresh,
  onClearFilters,
  updatedAt,
}: FieldFollowerReviewFilterProps) {
  return (
    <ListPageToolbar
      icon={UserCheck}
      title="ตรวจสอบใบสมัคร อสม./ผู้ติดตาม"
      description="ตรวจข้อมูลผู้สมัครและจัดการสิทธิ์การเข้าใช้งานระบบ"
      actions={actions}
      tableActions={<RefreshButton onRefresh={onRefresh} updatedAt={updatedAt} />}
      onClearFilters={onClearFilters}
      search={{
        value: searchQuery,
        onChange: onSearchChange,
        placeholder: "ค้นหาชื่อหรือเบอร์โทรศัพท์",
      }}
      filters={
        <>
          <SchoolAreaSchoolFilter area={area} hideSchool />
          <FilterSelect
            ariaLabel="กรองตามสถานะ"
            onChange={onStatusChange}
            value={status}
          >
            <option value="">ทุกสถานะ</option>
            {statusOptions.map((item) => (
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
