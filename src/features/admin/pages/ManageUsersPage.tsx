import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Users, UserPlus } from "lucide-react";
import { useConfirm } from "../../../components/base";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import {
  EmptyState,
  ErrorState,
  ListPageToolbar,
  PageShell,
  SkeletonTable,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { Pagination } from "../../../components/layout/pagination";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { UserTable } from "../components/UserTable";
import { useDeleteUser, useUsers } from "../hooks/useUsers";
import { getUserDisplayName } from "../lib/admin-presentation";
import type { ManagedUser } from "../types/admin.types";

export function ManageUsersPage() {
  const navigate = useNavigate();
  const deleteUser = useDeleteUser();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);

  const query = useMemo(
    () => ({
      searchTerm: debouncedSearch || undefined,
      page,
      limit: rowsPerPage,
    }),
    [debouncedSearch, page, rowsPerPage],
  );

  const { users, meta, isLoading, isError, refetch } = useUsers(query);
  const totalCount = meta?.totalCount ?? 0;

  function handleSearchChange(value: string): void {
    setSearchQuery(value);
    setPage(1);
  }

  function handleRowsPerPageChange(value: number): void {
    setRowsPerPage(value);
    setPage(1);
  }

  function openEdit(user: ManagedUser): void {
    if (user.id == null) {
      return;
    }
    void navigate(`/manage-users/${user.id}/edit`);
  }

  async function handleDelete(user: ManagedUser): Promise<void> {
    if (user.id == null) {
      return;
    }
    const confirmed = await confirm({
      title: "ลบผู้ใช้งาน",
      description: `ต้องการลบผู้ใช้งาน "${getUserDisplayName(user)}" ใช่หรือไม่?`,
      confirmText: "ลบ",
      variant: "destructive",
    });
    if (confirmed) {
      deleteUser.mutate(user.id);
    }
  }

  return (
    <PageShell maxWidthClassName="max-w-[1100px]">
      <ListPageToolbar
        icon={Users}
        actions={
          <>
            <NavButton icon={KeyRound} to="/manage-student-accounts" variant="outline">
              บัญชีนักเรียน
            </NavButton>
            <NavButton icon={UserPlus} to="/manage-users/new">
              เพิ่มผู้ใช้งาน
            </NavButton>
          </>
        }
        title="จัดการรายชื่อผู้ใช้งาน"
        description="เพิ่ม แก้ไข และกำหนดสิทธิ์ผู้ใช้งานในระบบ"
        search={{
          value: searchQuery,
          onChange: handleSearchChange,
          placeholder: "ค้นหาชื่อหรือ username...",
        }}
      />

      {isError ? (
        <ErrorState
          title="ไม่สามารถโหลดผู้ใช้งานได้"
          description="เกิดข้อผิดพลาดระหว่างโหลดรายชื่อผู้ใช้งาน"
          onRetry={refetch}
        />
      ) : isLoading ? (
        <SkeletonTable />
      ) : users.length === 0 ? (
        <EmptyState
          title={debouncedSearch ? "ไม่พบผู้ใช้งานที่ค้นหา" : "ไม่พบผู้ใช้งาน"}
        />
      ) : (
        <>
          <UserTable onDelete={handleDelete} onEdit={openEdit} users={users} />
          <Pagination
            onPageChange={setPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            totalCount={totalCount}
            unitLabel="คน"
          />
        </>
      )}

      {confirmDialog}
    </PageShell>
  );
}
