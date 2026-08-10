import { SquarePen, Trash2 } from "lucide-react";
import { Avatar, IconButton } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { resolveApiMediaUrl } from "../../../lib/media-url";
import { ContextLink } from "../../../components/layout/context-link";
import { getUserDisplayName, getUserRoleText } from "../lib/admin-presentation";
import type { ManagedUser } from "../types/admin.types";

interface UserTableProps {
  users: ManagedUser[];
  /** 1-based index of the first row on the current page, for the ลำดับ column. */
  startIndex: number;
  onEdit: (user: ManagedUser) => void;
  onDeactivate: (user: ManagedUser) => void;
  deactivatingUserId?: number | null;
  sort?: DataTableSortState;
  onSortChange: (sort: DataTableSortState | undefined) => void;
}

function UserIdentity({ user }: { user: ManagedUser }) {
  const displayName = getUserDisplayName(user);
  const content = (
    <>
      <Avatar
        className="transition-shadow group-hover:ring-2 group-hover:ring-primary/30"
        gradientName={displayName}
        imageAlt={`รูปประจำตัวของ ${displayName}`}
        imageUrl={resolveApiMediaUrl(user.photo_url ?? null)}
      />
      <span className="truncate text-slate-800">{displayName}</span>
    </>
  );

  if (user.id) {
    return (
      <ContextLink
        className="group flex min-w-0 items-center gap-3 rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary/40"
        to={`/manage-users/${user.id}`}
      >
        {content}
      </ContextLink>
    );
  }
  return <div className="flex min-w-0 items-center gap-3">{content}</div>;
}

function RowActions({
  user,
  onEdit,
  onDeactivate,
  deactivatingUserId,
}: Omit<UserTableProps, "users" | "startIndex" | "sort" | "onSortChange"> & {
  user: ManagedUser;
}) {
  const isDeactivating = deactivatingUserId === (user.id ?? -1);
  const displayName = getUserDisplayName(user);
  return (
    <div className="flex items-center justify-end gap-1">
      <IconButton
        aria-label={`แก้ไขผู้ใช้งาน ${displayName}`}
        disabled={isDeactivating}
        icon={SquarePen}
        onClick={() => onEdit(user)}
        variant="edit"
      />
      <IconButton
        aria-busy={isDeactivating}
        aria-label={`ปิดใช้งานผู้ใช้งาน ${displayName}`}
        disabled={isDeactivating}
        icon={Trash2}
        onClick={() => onDeactivate(user)}
        variant="delete"
      />
    </div>
  );
}

export function UserTable({
  users,
  startIndex,
  onEdit,
  onDeactivate,
  deactivatingUserId,
  sort,
  onSortChange,
}: UserTableProps) {
  return (
    <div className="flex flex-col gap-2">
      <DataTable
        headings={[
          "ลำดับ",
          { label: "ชื่อ-นามสกุล", sortKey: "name" },
          { label: "สถานะ", sortKey: "role" },
          { label: "สังกัด", sortKey: "affiliation" },
          "เครื่องมือ",
        ]}
        columnWidths={["w-[8%]", "w-[30%]", "w-[18%]", "w-[30%]", "w-[14%]"]}
        minWidthClassName="min-w-[900px]"
        onSortChange={onSortChange}
        sort={sort}
      >
        {users.map((user, index) => (
          <DataTableRow key={user.id ?? user.username}>
            <DataTableCell>
              {startIndex + index}
            </DataTableCell>
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
              <RowActions
                deactivatingUserId={deactivatingUserId}
                onDeactivate={onDeactivate}
                onEdit={onEdit}
                user={user}
              />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>

      <TableCardList>
        {users.map((user) => (
          <TableCard key={user.id ?? user.username}>
            <div className="flex items-start justify-between gap-3">
              <UserIdentity user={user} />
              <RowActions
                deactivatingUserId={deactivatingUserId}
                onDeactivate={onDeactivate}
                onEdit={onEdit}
                user={user}
              />
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-1 rounded-md bg-slate-50 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">สถานะ</dt>
                <dd className="text-slate-700">{getUserRoleText(user)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">สังกัด</dt>
                <dd className="truncate text-slate-700">
                  {user.affiliation || "-"}
                </dd>
              </div>
            </dl>
          </TableCard>
        ))}
      </TableCardList>
    </div>
  );
}
