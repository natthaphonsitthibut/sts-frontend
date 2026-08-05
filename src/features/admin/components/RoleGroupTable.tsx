import { SquarePen, Trash2 } from "lucide-react";
import { IconButton } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import { PAGE_IDENTITIES } from "../../../components/layout/page-identity";
import { EmptyState } from "../../../components/layout/page-primitives";
import type { RoleDefinition } from "../types/admin.types";

const MENU_GROUPS_ICON = PAGE_IDENTITIES["/manage-role-groups"].icon;

interface RoleGroupTableProps {
  labelOf: (permission: string) => string;
  onDelete: (roleGroup: RoleDefinition) => void;
  onEdit: (roleGroup: RoleDefinition) => void;
  onSortChange: (sort: DataTableSortState | undefined) => void;
  roleGroups: RoleDefinition[];
  sort?: DataTableSortState;
}

export function RoleGroupTable({
  labelOf,
  onDelete,
  onEdit,
  onSortChange,
  roleGroups,
  sort,
}: RoleGroupTableProps) {
  return (
    <DataTable
      columnWidths={["w-[30%]", "w-[55%]", "w-[15%]"]}
      headings={[
        { label: "กลุ่มเมนู", sortKey: "group" },
        { label: "เมนู", sortKey: "menus" },
        { label: "เครื่องมือ", className: "text-right" },
      ]}
      minWidthClassName="min-w-[640px]"
      onSortChange={onSortChange}
      responsive={false}
      sort={sort}
      footer={
        roleGroups.length === 0 ? (
          <EmptyState
            className="rounded-none border-none shadow-none"
            description="เพิ่มกลุ่มเมนูแรกเพื่อกำหนดรายการเมนูของโรงเรียนนี้"
            icon={MENU_GROUPS_ICON}
            title="ยังไม่มีกลุ่มเมนู"
          />
        ) : null
      }
    >
      {roleGroups.map((role) => {
        const menuLabels = role.default_permissions.map(labelOf);
        return (
          <DataTableRow key={role.id ?? role.name}>
            <DataTableCell className="font-semibold text-slate-800">
              {role.label || role.name}
            </DataTableCell>
            <DataTableCell className="whitespace-normal leading-6 text-slate-700">
              {menuLabels.length > 0 ? menuLabels.join(", ") : "-"}
            </DataTableCell>
            <DataTableCell>
              <div className="flex items-center justify-end gap-1">
                <IconButton
                  aria-label={`แก้ไขกลุ่มเมนู ${role.label || role.name}`}
                  icon={SquarePen}
                  onClick={() => onEdit(role)}
                  variant="edit"
                />
                <IconButton
                  aria-label={`ลบกลุ่มเมนู ${role.label || role.name}`}
                  icon={Trash2}
                  onClick={() => onDelete(role)}
                  variant="delete"
                />
              </div>
            </DataTableCell>
          </DataTableRow>
        );
      })}
    </DataTable>
  );
}
