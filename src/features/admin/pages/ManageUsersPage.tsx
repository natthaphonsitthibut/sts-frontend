import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { FormErrorAlert } from "../../../components/base";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SearchInput,
  SkeletonTable,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { PAGE_IDENTITIES } from "../../../components/layout/page-identity";
import { Pagination } from "../../../components/layout/pagination";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { getApiErrorMessage } from "../../../lib/api-error";
import { AccountDeactivationDialog } from "../components/AccountDeactivationDialog";
import { UserTable } from "../components/UserTable";
import type { DataTableSortState } from "../../../components/layout/data-table";
import { useDeactivateAccount, useUsers } from "../hooks/useUsers";
import { getUserDisplayName } from "../lib/admin-presentation";
import type {
  AccountDeactivationPayload,
  ManagedUser,
} from "../types/admin.types";

const MANAGE_USERS_ICON = PAGE_IDENTITIES["/manage-users"].icon;

/**
 * Teachers moved to จัดการข้อมูลคุณครู and student accounts were retired, so this
 * page covers staff accounts only — ผู้บริหาร, ผอ. and ผู้ดูแลระบบ.
 */
const NON_STAFF_ROLES = "TEACHER,STUDENT";

export function ManageUsersPage() {
  const navigate = useNavigate();
  const deactivateAccount = useDeactivateAccount();

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const [deactivationTarget, setDeactivationTarget] =
    useState<ManagedUser | null>(null);
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);

  const query = useMemo(
    () => ({
      searchTerm: debouncedSearch || undefined,
      excludeRole: NON_STAFF_ROLES,
      page,
      limit: rowsPerPage,
      sortBy: sort?.key as "name" | "role" | "affiliation" | undefined,
      sortOrder: sort?.direction,
    }),
    [debouncedSearch, page, rowsPerPage, sort],
  );

  const { users, meta, isLoading, isError, refetch } = useUsers(query);

  function handleSearchChange(value: string): void {
    setSearchQuery(value);
    setPage(1);
  }

  function openEdit(user: ManagedUser): void {
    if (user.id == null) return;
    void navigate(`/manage-users/${user.id}/edit`);
  }

  function handleDeactivate(user: ManagedUser): void {
    if (user.id == null) return;
    setDeactivationTarget(user);
  }

  function submitDeactivate(payload: AccountDeactivationPayload): void {
    if (deactivationTarget?.id == null) return;
    deactivateAccount.mutate(
      { id: deactivationTarget.id, payload },
      { onSuccess: () => setDeactivationTarget(null) },
    );
  }

  return (
    <PageShell>
      <PageToolbar
        actions={
          <NavButton icon={UserPlus} to="/manage-users/new">
            เพิ่มผู้ใช้งาน
          </NavButton>
        }
        description="เพิ่ม แก้ไข และกำหนดสิทธิ์ผู้ใช้งานในระบบ"
        icon={MANAGE_USERS_ICON}
        title="จัดการผู้ใช้งาน"
      />
      <ToolbarControls className="mb-8">
        <SearchInput
          className="sm:max-w-[560px]"
          onChange={handleSearchChange}
          placeholder="ค้นหา"
          value={searchQuery}
        />
      </ToolbarControls>

      <FormErrorAlert
        error={deactivateAccount.error}
        fallback="ปิดใช้งานบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง"
      />

      {isError ? (
        <ErrorState
          description="เกิดข้อผิดพลาดระหว่างโหลดรายชื่อผู้ใช้งาน"
          onRetry={refetch}
          title="ไม่สามารถโหลดผู้ใช้งานได้"
        />
      ) : isLoading ? (
        <SkeletonTable />
      ) : users.length === 0 ? (
        <EmptyState
          description={
            debouncedSearch
              ? "ลองเปลี่ยนคำค้นหา หรือเคลียร์ช่องค้นหาเพื่อดูรายการทั้งหมด"
              : "เพิ่มผู้ใช้งานแรกเพื่อเริ่มต้น"
          }
          icon={MANAGE_USERS_ICON}
          title={debouncedSearch ? "ไม่พบผู้ใช้งานที่ค้นหา" : "ไม่พบผู้ใช้งาน"}
        />
      ) : (
        <>
          <UserTable
            deactivatingUserId={
              deactivateAccount.isPending
                ? deactivateAccount.variables?.id
                : null
            }
            onDeactivate={handleDeactivate}
            onEdit={openEdit}
            onSortChange={(nextSort) => {
              setSort(nextSort);
              setPage(1);
            }}
            sort={sort}
            startIndex={(page - 1) * rowsPerPage + 1}
            users={users}
          />
          <Pagination
            onPageChange={setPage}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value);
              setPage(1);
            }}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            totalCount={meta?.totalCount ?? 0}
            unitLabel="คน"
          />
        </>
      )}

      <AccountDeactivationDialog
        key={deactivationTarget?.id ?? "none"}
        error={
          deactivateAccount.error
            ? getApiErrorMessage(
                deactivateAccount.error,
                "ปิดใช้งานบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง",
              )
            : undefined
        }
        isSubmitting={deactivateAccount.isPending}
        onClose={() => setDeactivationTarget(null)}
        onSubmit={submitDeactivate}
        open={Boolean(deactivationTarget)}
        targetName={
          deactivationTarget
            ? `ต้องการปิดใช้งาน "${getUserDisplayName(deactivationTarget)}"`
            : ""
        }
      />
    </PageShell>
  );
}
