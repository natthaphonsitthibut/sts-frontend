import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus } from "lucide-react";
import { useConfirm } from "../../../components/base";
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
import { UserTable } from "../components/UserTable";
import { useDeleteUser, useUsers } from "../hooks/useUsers";
import { getUserDisplayName } from "../lib/admin-presentation";
import type { ManagedUser } from "../types/admin.types";

export function ManageUsersPage() {
  const navigate = useNavigate();
  const { users, isLoading, isError, refetch } = useUsers();
  const deleteUser = useDeleteUser();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) {
      return users;
    }
    return users.filter(
      (user) =>
        getUserDisplayName(user).toLowerCase().includes(normalizedSearch) ||
        user.username.toLowerCase().includes(normalizedSearch),
    );
  }, [users, searchQuery]);

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
      <PageToolbar
        icon={Users}
        actions={
          <NavButton icon={UserPlus} to="/manage-users/new">
            เพิ่มผู้ใช้งาน
          </NavButton>
        }
        title="จัดการผู้ใช้งาน"
        description="เพิ่ม แก้ไข และกำหนดสิทธิ์ผู้ใช้งานในระบบ"
      >
        <ToolbarControls>
          <SearchInput
            onChange={setSearchQuery}
            placeholder="ค้นหาชื่อหรือ username..."
            value={searchQuery}
          />
        </ToolbarControls>
      </PageToolbar>

      {isError ? (
        <ErrorState
          title="ไม่สามารถโหลดผู้ใช้งานได้"
          description="เกิดข้อผิดพลาดระหว่างโหลดรายชื่อผู้ใช้งาน"
          onRetry={refetch}
        />
      ) : isLoading ? (
        <SkeletonTable />
      ) : filteredUsers.length === 0 ? (
        <EmptyState title="ไม่พบผู้ใช้งาน" />
      ) : (
        <UserTable
          onDelete={handleDelete}
          onEdit={openEdit}
          users={filteredUsers}
        />
      )}

      {confirmDialog}
    </PageShell>
  );
}
