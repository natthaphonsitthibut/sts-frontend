import { useMemo, useState } from "react";
import { KeyRound, UserCheck, UserX } from "lucide-react";
import { Badge, Checkbox, IconButton } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { LinkTimeHeader, LinkTimeSummary } from "../../../components/layout/link-time-summary";
import type { StudentAccountManagementItem } from "../types/admin.types";
import {
  getAccountLifecycleStatusMeta,
  getUserAvatarGradient,
} from "../lib/admin-presentation";
import { cn } from "../../../lib/utils";

type IdCollection = ReadonlySet<number> | readonly number[];

export interface StudentAccountManagementTableProps {
  rows: readonly StudentAccountManagementItem[];
  selectedIds: IdCollection;
  onSelectRow: (
    userId: number,
    selected: boolean,
    row: StudentAccountManagementItem,
  ) => void;
  onSelectAll: (
    selected: boolean,
    rows: readonly StudentAccountManagementItem[],
  ) => void;
  onReissueTemporaryPassword: (row: StudentAccountManagementItem) => void;
  onDeactivate: (row: StudentAccountManagementItem) => void;
  onReactivate: (row: StudentAccountManagementItem) => void;
  pendingReissueIds?: IdCollection;
  pendingDeactivateIds?: IdCollection;
  pendingReactivateIds?: IdCollection;
  sort?: DataTableSortState;
  onSortChange?: (sort: DataTableSortState | undefined) => void;
}

function hasId(ids: IdCollection | undefined, id: number): boolean {
  if (!ids) return false;
  return "has" in ids ? ids.has(id) : ids.includes(id);
}

function compareText(a: string | undefined, b: string | undefined): number {
  return (a || "").localeCompare(b || "", "th");
}

function formatClassLevel(row: StudentAccountManagementItem): string {
  return `${row.grade ?? "-"} / ${row.room ?? "-"}`;
}

function getSortValue(row: StudentAccountManagementItem, key: string): string {
  if (key === "student") return row.studentName;
  if (key === "school") return row.schoolName ?? "";
  if (key === "class") return formatClassLevel(row);
  if (key === "username") return row.username;
  if (key === "status") return getAccountLifecycleStatusMeta(row.status).label;
  if (key === "accountStatus") return row.accountStatus ?? "";
  if (key === "starts") return row.temporaryPasswordIssuedAt ?? "";
  if (key === "expires") return row.temporaryPasswordExpiresAt ?? "";
  if (key === "remaining") return row.temporaryPasswordExpiresAt ?? "";
  return "";
}

function StatusBadge({ row }: { row: StudentAccountManagementItem }) {
  const status = getAccountLifecycleStatusMeta(row.status);
  return <Badge className={status.badgeClass} variant="secondary">{status.label}</Badge>;
}

function AccountState({ row }: { row: StudentAccountManagementItem }) {
  const status = getAccountLifecycleStatusMeta(row.status);
  return (
    <Badge className={cn("w-full justify-center", status.badgeClass)} variant="secondary">
      {status.label}
    </Badge>
  );
}

function RowActions({
  pendingDeactivateIds,
  pendingReactivateIds,
  pendingReissueIds,
  row,
  onDeactivate,
  onReactivate,
  onReissueTemporaryPassword,
}: Pick<
  StudentAccountManagementTableProps,
  | "onDeactivate"
  | "onReactivate"
  | "onReissueTemporaryPassword"
  | "pendingDeactivateIds"
  | "pendingReactivateIds"
  | "pendingReissueIds"
> & {
  row: StudentAccountManagementItem;
}) {
  const isDisabled = row.status === "DISABLED";
  const isReissuing = hasId(pendingReissueIds, row.userId);
  const isDeactivating = hasId(pendingDeactivateIds, row.userId);
  const isReactivating = hasId(pendingReactivateIds, row.userId);
  return (
    <div className="flex items-center justify-end gap-1">
      {!isDisabled ? (
        <IconButton
          aria-busy={isReissuing}
          aria-label={`ออกรหัสชั่วคราวใหม่ให้ ${row.studentName}`}
          className="text-warning"
          disabled={isReissuing || isDeactivating}
          icon={KeyRound}
          onClick={() => onReissueTemporaryPassword(row)}
          variant="ghost"
        />
      ) : null}
      <IconButton
        aria-busy={isDeactivating}
        aria-label={`ปิดใช้งานบัญชีของ ${row.studentName}`}
        className="text-danger"
        disabled={isDisabled || isDeactivating || isReissuing}
        icon={UserX}
        onClick={() => onDeactivate(row)}
        variant="ghost"
      />
      {isDisabled ? (
        <IconButton
          aria-busy={isReactivating}
          aria-label={`เปิดใช้งานบัญชีของ ${row.studentName}`}
          className="text-success"
          disabled={isReactivating}
          icon={UserCheck}
          onClick={() => onReactivate(row)}
          variant="ghost"
        />
      ) : null}
    </div>
  );
}

function StudentIdentity({ row }: { row: StudentAccountManagementItem }) {
  const initial = row.studentName.trim().charAt(0) || "น";
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
        style={getUserAvatarGradient(row.studentName)}
      >
        {initial}
      </div>
      <div className="min-w-0">
        <div className="truncate font-bold text-slate-800">{row.studentName}</div>
        <div className="truncate font-mono text-xs font-semibold text-slate-400">
          @{row.username}
        </div>
      </div>
    </div>
  );
}

export function StudentAccountManagementTable({
  rows,
  selectedIds,
  onDeactivate,
  onReactivate,
  onReissueTemporaryPassword,
  onSelectAll,
  onSelectRow,
  onSortChange,
  pendingDeactivateIds,
  pendingReactivateIds,
  pendingReissueIds,
  sort,
}: StudentAccountManagementTableProps) {
  const [localSort, setLocalSort] = useState<DataTableSortState | undefined>();
  const activeSort = onSortChange ? sort : localSort;
  const setActiveSort = onSortChange ?? setLocalSort;

  const sortedRows = useMemo(() => {
    if (!activeSort) return rows;
    return [...rows].sort((left, right) => {
      const result = compareText(
        getSortValue(left, activeSort.key),
        getSortValue(right, activeSort.key),
      );
      return activeSort.direction === "asc" ? result : -result;
    });
  }, [rows, activeSort]);

  const allSelected =
    sortedRows.length > 0 && sortedRows.every((row) => hasId(selectedIds, row.userId));

  return (
    <div className="flex flex-col gap-2">
      <DataTable
        headings={[
          {
            label: (
              <Checkbox
                aria-label="เลือกบัญชีนักเรียนทั้งหมด"
                checked={allSelected}
                onChange={(event) => onSelectAll(event.currentTarget.checked, sortedRows)}
              />
            ),
            className: "w-[52px]",
          },
          { label: "นักเรียน", sortKey: "student" },
          { label: "โรงเรียน", sortKey: "school" },
          { label: "ชั้น/ห้อง", sortKey: "class" },
          { label: "สถานะบัญชี", sortKey: "status" },
          {
            label: (
              <LinkTimeHeader
                onSortChange={setActiveSort}
                sort={activeSort}
              />
            ),
          },
          "",
        ]}
        columnWidths={[
          "w-[52px]",
          "w-[18%]",
          "w-[16%]",
          "w-[10%]",
          "w-[14%]",
          "w-[30%]",
          "w-[10%]",
        ]}
        footer={
          sortedRows.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              ยังไม่มีบัญชีนักเรียน
            </div>
          ) : null
        }
        minWidthClassName="min-w-[1040px]"
        onSortChange={setActiveSort}
        sort={activeSort}
      >
        {sortedRows.map((row) => {
          const checked = hasId(selectedIds, row.userId);
          return (
            <DataTableRow key={row.userId}>
              <DataTableCell>
                <Checkbox
                  aria-label={`เลือกบัญชีของ ${row.studentName}`}
                  checked={checked}
                  onChange={(event) =>
                    onSelectRow(row.userId, event.currentTarget.checked, row)
                  }
                />
              </DataTableCell>
              <DataTableCell>
                <StudentIdentity row={row} />
              </DataTableCell>
              <DataTableCell className="text-sm font-medium text-slate-600">
                {row.schoolName || "-"}
              </DataTableCell>
              <DataTableCell className="text-sm font-medium text-slate-600">
                {formatClassLevel(row)}
              </DataTableCell>
              <DataTableCell>
                <AccountState row={row} />
              </DataTableCell>
              <DataTableCell>
                <LinkTimeSummary
                  expiresAt={row.temporaryPasswordExpiresAt}
                  startsAt={row.temporaryPasswordIssuedAt}
                  variant="columns"
                />
              </DataTableCell>
              <DataTableCell>
                <RowActions
                  onDeactivate={onDeactivate}
                  onReactivate={onReactivate}
                  onReissueTemporaryPassword={onReissueTemporaryPassword}
                  pendingDeactivateIds={pendingDeactivateIds}
                  pendingReactivateIds={pendingReactivateIds}
                  pendingReissueIds={pendingReissueIds}
                  row={row}
                />
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTable>

      <TableCardList>
        {sortedRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
            ยังไม่มีบัญชีนักเรียน
          </div>
        ) : null}
        {sortedRows.map((row) => {
          const checked = hasId(selectedIds, row.userId);
          return (
            <TableCard key={row.userId}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Checkbox
                    aria-label={`เลือกบัญชีของ ${row.studentName}`}
                    checked={checked}
                    onChange={(event) =>
                      onSelectRow(row.userId, event.currentTarget.checked, row)
                    }
                  />
                  <StudentIdentity row={row} />
                </div>
                <StatusBadge row={row} />
              </div>
              <div className="mt-3 grid gap-1 text-sm text-slate-600">
                <div className="font-medium">{row.schoolName || "-"}</div>
                <div>{formatClassLevel(row)}</div>
              </div>
              <div className="mt-3 rounded-md bg-slate-50 p-3">
                <LinkTimeSummary
                  expiresAt={row.temporaryPasswordExpiresAt}
                  startsAt={row.temporaryPasswordIssuedAt}
                />
              </div>
              <div className="mt-4">
                <RowActions
                  onDeactivate={onDeactivate}
                  onReactivate={onReactivate}
                  onReissueTemporaryPassword={onReissueTemporaryPassword}
                  pendingDeactivateIds={pendingDeactivateIds}
                  pendingReactivateIds={pendingReactivateIds}
                  pendingReissueIds={pendingReissueIds}
                  row={row}
                />
              </div>
            </TableCard>
          );
        })}
      </TableCardList>
    </div>
  );
}
