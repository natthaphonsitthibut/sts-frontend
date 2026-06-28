import { useMemo, useState } from "react";
import { SquarePen, Trash2 } from "lucide-react";
import { Badge, IconButton } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import {
  getUserAvatarGradient,
  getUserDisplayName,
  getUserInitial,
  getUserRoleText,
} from "../lib/admin-presentation";
import type { ManagedUser } from "../types/admin.types";

interface UserTableProps {
  users: ManagedUser[];
  onEdit: (user: ManagedUser) => void;
  onDelete: (user: ManagedUser) => void;
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "ACTIVE";
  return (
    <Badge variant={isActive ? "success" : "secondary"}>
      {isActive ? "ใช้งาน" : "ปิดการใช้งาน"}
    </Badge>
  );
}

function UserIdentity({ user }: { user: ManagedUser }) {
  const displayName = getUserDisplayName(user);
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
        style={getUserAvatarGradient(displayName)}
      >
        {getUserInitial(user)}
      </div>
      <div className="min-w-0">
        <div className="truncate font-bold text-slate-800">{displayName}</div>
        <div className="truncate text-xs font-semibold text-slate-400">
          @{user.username}
        </div>
      </div>
    </div>
  );
}

function RowActions({
  user,
  onEdit,
  onDelete,
}: UserTableProps & { user: ManagedUser }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <IconButton
        aria-label="แก้ไขผู้ใช้งาน"
        className="text-primary"
        icon={SquarePen}
        onClick={() => onEdit(user)}
        variant="ghost"
      />
      <IconButton
        aria-label="ลบผู้ใช้งาน"
        className="text-danger"
        icon={Trash2}
        onClick={() => onDelete(user)}
        variant="ghost"
      />
    </div>
  );
}

function compareText(a: string | undefined, b: string | undefined): number {
  return (a || "").localeCompare(b || "", "th");
}

function getUserSortValue(user: ManagedUser, key: string): string {
  if (key === "name") return getUserDisplayName(user);
  if (key === "role") return getUserRoleText(user);
  if (key === "affiliation") return user.affiliation || "";
  if (key === "status") return user.status || "";
  return "";
}

export function UserTable({ users, onEdit, onDelete }: UserTableProps) {
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const sortedUsers = useMemo(() => {
    if (!sort) return users;
    return [...users].sort((a, b) => {
      const result = compareText(
        getUserSortValue(a, sort.key),
        getUserSortValue(b, sort.key),
      );
      return sort.direction === "asc" ? result : -result;
    });
  }, [users, sort]);

  return (
    <div className="flex flex-col gap-2">
      <DataTable
        headings={[
          { label: "ผู้ใช้งาน", sortKey: "name" },
          { label: "ตำแหน่ง", sortKey: "role" },
          { label: "สังกัด", sortKey: "affiliation" },
          { label: "สถานะ", sortKey: "status" },
          "",
        ]}
        minWidthClassName="min-w-[760px]"
        onSortChange={setSort}
        sort={sort}
      >
        {sortedUsers.map((user) => (
          <DataTableRow key={user.id ?? user.username}>
            <DataTableCell>
              <UserIdentity user={user} />
            </DataTableCell>
            <DataTableCell className="text-sm font-medium text-slate-600">
              {getUserRoleText(user)}
            </DataTableCell>
            <DataTableCell className="text-sm text-slate-500">
              {user.affiliation || "-"}
            </DataTableCell>
            <DataTableCell>
              <StatusBadge status={user.status} />
            </DataTableCell>
            <DataTableCell>
              <RowActions
                onDelete={onDelete}
                onEdit={onEdit}
                user={user}
                users={users}
              />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>

      <TableCardList>
        {sortedUsers.map((user) => (
          <TableCard key={user.id ?? user.username}>
            <div className="flex items-start justify-between gap-3">
              <UserIdentity user={user} />
              <StatusBadge status={user.status} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                {getUserRoleText(user)}
              </div>
              <RowActions
                onDelete={onDelete}
                onEdit={onEdit}
                user={user}
                users={users}
              />
            </div>
          </TableCard>
        ))}
      </TableCardList>
    </div>
  );
}
