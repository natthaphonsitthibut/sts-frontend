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
import {
  getManageUserPath,
  getUserDisplayName,
  getUserRoleText,
} from "../lib/admin-presentation";
import type { ManagedUser } from "../types/admin.types";

interface UserTableProps {
  users: ManagedUser[];
  currentUserId: number | null;
  /** 1-based index of the first row on the current page, for the ลำดับ column. */
  startIndex: number;
  onEdit: (user: ManagedUser) => void;
  onDeactivate: (user: ManagedUser) => void;
  deactivatingUserId?: number | null;
  sort?: DataTableSortState;
  onSortChange: (sort: DataTableSortState | undefined) => void;
  /**
   * Council accounts belong to an area, not a school: show จังหวัด / อำเภอ-เขต /
   * ตำบล-แขวง in place of สังกัด (owner, 2026-09-25).
   */
  showArea?: boolean;
}

const AREA_COLUMNS = [
  { label: "จังหวัด", key: "provinces" },
  { label: "อำเภอ/เขต", key: "districts" },
  { label: "ตำบล/แขวง", key: "sub_districts" },
] as const;

/** One level of an account's area, as stored in its data_scope. */
function areaValue(
  user: ManagedUser,
  key: (typeof AREA_COLUMNS)[number]["key"],
): string {
  if (user.data_scope?.global) return key === "provinces" ? "ทั้งประเทศ" : "-";
  const values = user.data_scope?.[key] ?? [];
  return values.length > 0 ? values.join(", ") : "-";
}

function UserIdentity({
  user,
  currentUserId,
}: {
  user: ManagedUser;
  currentUserId: number | null;
}) {
  const displayName = getUserDisplayName(user);
  const content = (
    <>
      <Avatar
        className="transition-shadow group-hover:ring-2 group-hover:ring-primary/30"
        gradientName={displayName}
        imageAlt={`รูปประจำตัวของ ${displayName}`}
        imageUrl={resolveApiMediaUrl(user.photo_url ?? null)}
      />
      <span className="min-w-0">
        <span className="block truncate text-slate-800">{displayName}</span>
      </span>
    </>
  );

  if (user.id) {
    return (
      <ContextLink
        className="group flex min-w-0 items-center gap-3 rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary/40"
        to={user.id === currentUserId ? "/profile" : getManageUserPath(user)}
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
}: Omit<
  UserTableProps,
  "users" | "startIndex" | "sort" | "onSortChange" | "currentUserId"
> & {
  user: ManagedUser;
}) {
  const isDeactivating = deactivatingUserId === (user.id ?? -1);
  const displayName = getUserDisplayName(user);
  return (
    <div className="flex items-center justify-center gap-1">
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
  currentUserId,
  sort,
  onSortChange,
  showArea = false,
}: UserTableProps) {
  return (
    <div className="flex flex-col gap-2">
      <DataTable
        headings={[
          "ลำดับ",
          { label: "ชื่อ-นามสกุล", sortKey: "name" },
          { label: "สถานะ", sortKey: "role" },
          ...(showArea
            ? AREA_COLUMNS.map((column) => column.label)
            : [{ label: "สังกัด", sortKey: "affiliation" }]),
          { isAction: true, label: "เครื่องมือ" },
        ]}
        columnWidths={
          showArea
            ? [
                "w-[7%]",
                "w-[26%]",
                "w-[15%]",
                "w-[13%]",
                "w-[13%]",
                "w-[13%]",
                "w-[13%]",
              ]
            : ["w-[8%]", "w-[30%]", "w-[18%]", "w-[30%]", "w-[14%]"]
        }
        minWidthClassName="min-w-[900px]"
        onSortChange={onSortChange}
        sort={sort}
      >
        {users.map((user, index) => (
          <DataTableRow key={user.id ?? user.username}>
            <DataTableCell>{startIndex + index}</DataTableCell>
            <DataTableCell>
              <UserIdentity currentUserId={currentUserId} user={user} />
            </DataTableCell>
            <DataTableCell className="text-sm font-medium text-slate-600">
              {getUserRoleText(user)}
            </DataTableCell>
            {showArea ? (
              AREA_COLUMNS.map((column) => (
                <DataTableCell
                  className="text-sm text-slate-500"
                  key={column.key}
                >
                  {areaValue(user, column.key)}
                </DataTableCell>
              ))
            ) : (
              <DataTableCell className="text-sm text-slate-500">
                {user.affiliation || "-"}
              </DataTableCell>
            )}
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
              <UserIdentity currentUserId={currentUserId} user={user} />
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
              {showArea ? (
                AREA_COLUMNS.map((column) => (
                  <div className="flex justify-between gap-3" key={column.key}>
                    <dt className="text-slate-500">{column.label}</dt>
                    <dd className="truncate text-slate-700">
                      {areaValue(user, column.key)}
                    </dd>
                  </div>
                ))
              ) : (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">สังกัด</dt>
                  <dd className="truncate text-slate-700">
                    {user.affiliation || "-"}
                  </dd>
                </div>
              )}
            </dl>
          </TableCard>
        ))}
      </TableCardList>
    </div>
  );
}
