import { Lock, SquarePen, Trash2 } from "lucide-react";
import { Badge, IconButton } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
} from "../../../components/layout/data-table";
import { ROLE_SCOPE_MODE_LABELS } from "../lib/admin-presentation";
import type { RoleDefinition } from "../types/admin.types";

interface RoleGroupTableProps {
  roleGroups: RoleDefinition[];
  onEdit: (roleGroup: RoleDefinition) => void;
  onDelete: (roleGroup: RoleDefinition) => void;
}

export function RoleGroupTable({
  roleGroups,
  onEdit,
  onDelete,
}: RoleGroupTableProps) {
  return (
    <DataTable
      headings={["ตำแหน่ง", "ขอบเขตข้อมูล", "สิทธิ์", "ผู้ใช้", ""]}
      minWidthClassName="min-w-[720px]"
      responsive={false}
      footer={
        roleGroups.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            ยังไม่มีกลุ่มสิทธิ์
          </div>
        ) : null
      }
    >
      {roleGroups.map((role) => (
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
          <DataTableCell className="text-sm text-slate-600">
            {ROLE_SCOPE_MODE_LABELS[role.scope_mode] ?? role.scope_mode}
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
