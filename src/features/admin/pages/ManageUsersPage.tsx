import { useMemo, useState } from "react";
import { Users, UserPlus } from "lucide-react";
import { Button, useConfirm } from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SearchInput,
  SkeletonTable,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { UserFormDialog } from "../components/UserFormDialog";
import { UserTable } from "../components/UserTable";
import { useDeleteUser, useRolesCatalog, useUsers } from "../hooks/useUsers";
import { getUserDisplayName } from "../lib/admin-presentation";
import type { ManagedUser } from "../types/admin.types";

export function ManageUsersPage() {
  const { users, isLoading, isError, refetch } = useUsers();
  const rolesCatalog = useRolesCatalog();
  const deleteUser = useDeleteUser();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  function openCreate(): void {
    setSelectedUser(null);
    setDialogOpen(true);
  }

  function openEdit(user: ManagedUser): void {
    setSelectedUser(user);
    setDialogOpen(true);
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
          <Button icon={UserPlus} onClick={openCreate}>
            เพิ่มผู้ใช้งาน
          </Button>
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

      <UserFormDialog
        key={selectedUser?.id ?? "new"}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        rolesCatalog={rolesCatalog}
        user={selectedUser}
      />
      {confirmDialog}
    </PageShell>
  );
}
