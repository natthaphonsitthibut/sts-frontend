import { useMemo, useState } from "react";
import { Lock, SquarePen, Trash2 } from "lucide-react";
import { Badge, IconButton } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import type { RoleDefinition } from "../types/admin.types";

interface RoleGroupTableProps {
  roleGroups: RoleDefinition[];
  onEdit: (roleGroup: RoleDefinition) => void;
  onDelete: (roleGroup: RoleDefinition) => void;
}

function compareText(a: string | undefined, b: string | undefined): number {
  return (a || "").localeCompare(b || "", "th");
}

function compareNumber(a: number | null | undefined, b: number | null | undefined): number {
  return (a ?? 0) - (b ?? 0);
}

function compareRoleGroups(left: RoleDefinition, right: RoleDefinition, key: string): number {
  if (key === "role") return compareText(left.label || left.name, right.label || right.name);
  if (key === "rank") return compareNumber(left.rank, right.rank);
  if (key === "permissions") {
    return compareNumber(left.default_permissions.length, right.default_permissions.length);
  }
  if (key === "users") return compareNumber(left.user_count, right.user_count);
  return 0;
}

export function RoleGroupTable({
  roleGroups,
  onEdit,
  onDelete,
}: RoleGroupTableProps) {
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const sortedRoleGroups = useMemo(() => {
    if (!sort) return roleGroups;
    return [...roleGroups].sort((a, b) => {
      const result = compareRoleGroups(a, b, sort.key);
      return sort.direction === "asc" ? result : -result;
    });
  }, [roleGroups, sort]);

  return (
    <DataTable
      headings={[
        { label: "ตำแหน่ง", sortKey: "role" },
        { label: "ลำดับขั้น", sortKey: "rank" },
        { label: "สิทธิ์", sortKey: "permissions" },
        { label: "ผู้ใช้", sortKey: "users" },
        "",
      ]}
      minWidthClassName="min-w-[640px]"
      onSortChange={setSort}
      responsive={false}
      sort={sort}
      footer={
        roleGroups.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            ยังไม่มีกลุ่มสิทธิ์
          </div>
        ) : null
      }
    >
      {sortedRoleGroups.map((role) => (
        <DataTableRow key={role.id ?? role.name}>
          <DataTableCell>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">
                {role.label || role.name}
              </span>
              {role.is_system ? (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="size-3" aria-hidden="true" />
                  ระบบ
                </Badge>
              ) : null}
            </div>
            <div className="mt-0.5 text-xs font-semibold text-slate-400">
              {role.name} · ลำดับ {role.rank}
            </div>
          </DataTableCell>
          <DataTableCell className="text-sm font-bold tabular-nums text-slate-700">
            {role.rank}
          </DataTableCell>
          <DataTableCell className="text-sm font-medium text-slate-500">
            {role.default_permissions.length} รายการ
          </DataTableCell>
          <DataTableCell className="text-sm font-medium text-slate-500">
            {role.user_count ?? 0}
          </DataTableCell>
          <DataTableCell>
            <div className="flex items-center justify-end gap-1">
              <IconButton
                aria-label="แก้ไขกลุ่มสิทธิ์"
                className="text-primary"
                icon={SquarePen}
                onClick={() => onEdit(role)}
                variant="ghost"
              />
              <IconButton
                aria-label="ลบกลุ่มสิทธิ์"
                className="text-danger disabled:opacity-40"
                disabled={role.is_system}
                icon={Trash2}
                onClick={() => onDelete(role)}
                variant="ghost"
              />
            </div>
          </DataTableCell>
        </DataTableRow>
      ))}
    </DataTable>
  );
}
