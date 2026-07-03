import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, SquarePen, UserCheck, UserX } from "lucide-react";
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
  LinkTimeHeader,
  LinkTimeSummary,
} from "../../../components/layout/link-time-summary";
import {
  getAccountLifecycleStatusMeta,
  getManagedUserLifecycleStatus,
  getUserAvatarGradient,
  getUserDisplayName,
  getUserInitial,
  getUserRoleText,
} from "../lib/admin-presentation";
import type { ManagedUser } from "../types/admin.types";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";

interface UserTableProps {
  users: ManagedUser[];
  onEdit: (user: ManagedUser) => void;
  onDeactivate: (user: ManagedUser) => void;
  onReactivate: (user: ManagedUser) => void;
  onReissueTemporaryPassword: (user: ManagedUser) => void;
  deactivatingUserId?: number | null;
  reactivatingUserId?: number | null;
  reissuingUserId?: number | null;
}

function StatusBadge({
  catalog,
  user,
}: {
  catalog: readonly StatusCatalogItem[];
  user: ManagedUser;
}) {
  const status = getAccountLifecycleStatusMeta(getManagedUserLifecycleStatus(user), catalog);
  return (
    <Badge className="whitespace-nowrap" variant={status.badgeVariant}>
      {status.label}
    </Badge>
  );
}

function UserIdentity({ user }: { user: ManagedUser }) {
  const displayName = getUserDisplayName(user);
  const content = (
    <>
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
    </>
  );

  if (user.id) {
    return (
      <Link
        className="flex min-w-0 items-center gap-3 rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary/40"
        to={`/manage-users/${user.id}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      {content}
    </div>
  );
}

function RowActions({
  user,
  onEdit,
  onDeactivate,
  onReactivate,
  onReissueTemporaryPassword,
  deactivatingUserId,
  reactivatingUserId,
  reissuingUserId,
}: UserTableProps & { user: ManagedUser }) {
  const userId = user.id ?? -1;
  const isDisabled = user.status !== "ACTIVE";
  const isDeactivating = deactivatingUserId === userId;
  const isReactivating = reactivatingUserId === userId;

  return (
    <div className="flex items-center justify-end gap-1">
      {!isDisabled ? (
        <IconButton
          aria-label="ออกรหัสชั่วคราวใหม่"
          className="text-warning"
          disabled={reissuingUserId === userId || isDeactivating}
          icon={KeyRound}
          onClick={() => onReissueTemporaryPassword(user)}
          variant="ghost"
        />
      ) : null}
      <IconButton
        aria-label="แก้ไขผู้ใช้งาน"
        className="text-primary"
        disabled={isDeactivating || isReactivating}
        icon={SquarePen}
        onClick={() => onEdit(user)}
        variant="ghost"
      />
      {isDisabled ? (
        <IconButton
          aria-busy={isReactivating}
          aria-label="เปิดใช้งานผู้ใช้งาน"
          className="text-success"
          disabled={isReactivating}
          icon={UserCheck}
          onClick={() => onReactivate(user)}
          variant="ghost"
        />
      ) : (
        <IconButton
          aria-busy={isDeactivating}
          aria-label="ปิดใช้งานผู้ใช้งาน"
          className="text-danger"
          disabled={isDeactivating}
          icon={UserX}
          onClick={() => onDeactivate(user)}
          variant="ghost"
        />
      )}
    </div>
  );
}

function compareText(a: string | undefined, b: string | undefined): number {
  return (a || "").localeCompare(b || "", "th");
}

function getUserSortValue(
  user: ManagedUser,
  key: string,
  catalog: readonly StatusCatalogItem[],
): string {
  if (key === "name") return getUserDisplayName(user);
  if (key === "role") return getUserRoleText(user);
  if (key === "affiliation") return user.affiliation || "";
  if (key === "status") {
    return getAccountLifecycleStatusMeta(getManagedUserLifecycleStatus(user), catalog).label;
  }
  if (key === "starts") return user.temporary_password_issued_at ?? "";
  if (key === "expires") return user.temporary_password_expires_at ?? "";
  if (key === "remaining") return user.temporary_password_expires_at ?? "";
  return "";
}

export function UserTable({
  users,
  onEdit,
  onDeactivate,
  onReactivate,
  onReissueTemporaryPassword,
  deactivatingUserId,
  reactivatingUserId,
  reissuingUserId,
}: UserTableProps) {
  const lifecycleCatalog = useStatusCatalog("USER_ACCOUNT_LIFECYCLE").items;
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const sortedUsers = useMemo(() => {
    if (!sort) return users;
    return [...users].sort((a, b) => {
      const result = compareText(
        getUserSortValue(a, sort.key, lifecycleCatalog),
        getUserSortValue(b, sort.key, lifecycleCatalog),
      );
      return sort.direction === "asc" ? result : -result;
    });
  }, [lifecycleCatalog, users, sort]);

  return (
    <div className="flex flex-col gap-2">
      <DataTable
        headings={[
          { label: "ผู้ใช้งาน", sortKey: "name" },
          { label: "ตำแหน่ง", sortKey: "role" },
          { label: "สังกัด", sortKey: "affiliation" },
          { label: "สถานะ", sortKey: "status" },
          { label: <LinkTimeHeader onSortChange={setSort} sort={sort} /> },
          "",
        ]}
        columnWidths={[
          "w-[21%]",
          "w-[10%]",
          "w-[14%]",
          "w-[14%]",
          "w-[28%]",
          "w-[13%]",
        ]}
        minWidthClassName="min-w-[1000px]"
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
              <StatusBadge catalog={lifecycleCatalog} user={user} />
            </DataTableCell>
            <DataTableCell>
              <LinkTimeSummary
                expiresAt={user.temporary_password_expires_at}
                startsAt={user.temporary_password_issued_at}
                variant="columns"
              />
            </DataTableCell>
            <DataTableCell>
              <RowActions
                deactivatingUserId={deactivatingUserId}
                onDeactivate={onDeactivate}
                onEdit={onEdit}
                onReactivate={onReactivate}
                onReissueTemporaryPassword={onReissueTemporaryPassword}
                reactivatingUserId={reactivatingUserId}
                reissuingUserId={reissuingUserId}
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
              <StatusBadge catalog={lifecycleCatalog} user={user} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                {getUserRoleText(user)}
              </div>
              <RowActions
                deactivatingUserId={deactivatingUserId}
                onDeactivate={onDeactivate}
                onEdit={onEdit}
                onReactivate={onReactivate}
                onReissueTemporaryPassword={onReissueTemporaryPassword}
                reactivatingUserId={reactivatingUserId}
                reissuingUserId={reissuingUserId}
                user={user}
                users={users}
              />
            </div>
            <div className="mt-3 rounded-md bg-slate-50 p-3">
              <LinkTimeSummary
                expiresAt={user.temporary_password_expires_at}
                startsAt={user.temporary_password_issued_at}
              />
            </div>
          </TableCard>
        ))}
      </TableCardList>
    </div>
  );
}
