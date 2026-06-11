import { useMemo, useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { Button, useConfirm } from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SearchInput,
  SkeletonTable,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { RoleGroupFormDialog } from "../components/RoleGroupFormDialog";
import { RoleGroupTable } from "../components/RoleGroupTable";
import { useDeleteRoleGroup, useRoleGroups } from "../hooks/useRoleGroups";
import type { RoleDefinition } from "../types/admin.types";

export function ManageRoleGroupsPage() {
  const { roleGroups, isLoading, isError, refetch } = useRoleGroups();
  const deleteRoleGroup = useDeleteRoleGroup();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleGroup, setSelectedRoleGroup] =
    useState<RoleDefinition | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredRoleGroups = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) {
      return roleGroups;
    }
    return roleGroups.filter(
      (role) =>
        role.label.toLowerCase().includes(normalizedSearch) ||
        role.name.toLowerCase().includes(normalizedSearch),
    );
  }, [roleGroups, searchQuery]);

  function openCreate(): void {
    setSelectedRoleGroup(null);
    setDialogOpen(true);
  }

  function openEdit(roleGroup: RoleDefinition): void {
    setSelectedRoleGroup(roleGroup);
    setDialogOpen(true);
  }

  async function handleDelete(roleGroup: RoleDefinition): Promise<void> {
    if (roleGroup.is_system) {
      return;
    }
    const confirmed = await confirm({
      title: "ลบกลุ่มสิทธิ์",
      description: `ต้องการลบกลุ่มสิทธิ์ "${roleGroup.label || roleGroup.name}" ใช่หรือไม่?`,
      confirmText: "ลบ",
      variant: "destructive",
    });
    if (confirmed) {
      deleteRoleGroup.mutate(roleGroup.name);
    }
  }

  return (
    <PageShell maxWidthClassName="max-w-[1100px]">
      <PageToolbar
        icon={ShieldCheck}
        actions={
          <Button icon={Plus} onClick={openCreate}>
            เพิ่มกลุ่มสิทธิ์
          </Button>
        }
        title="จัดการกลุ่มผู้ใช้งาน"
        description="กำหนดกลุ่มสิทธิ์และแมปสิทธิ์การใช้งานของแต่ละตำแหน่ง"
      >
        <ToolbarControls>
          <SearchInput
            onChange={setSearchQuery}
            placeholder="ค้นหาตำแหน่ง..."
            value={searchQuery}
          />
        </ToolbarControls>
      </PageToolbar>

      {isError ? (
        <ErrorState
          title="ไม่สามารถโหลดกลุ่มสิทธิ์ได้"
          description="เกิดข้อผิดพลาดระหว่างโหลดข้อมูลกลุ่มสิทธิ์"
          onRetry={refetch}
        />
      ) : isLoading ? (
        <SkeletonTable />
      ) : (
        <RoleGroupTable
          onDelete={handleDelete}
          onEdit={openEdit}
          roleGroups={filteredRoleGroups}
        />
      )}

      <RoleGroupFormDialog
        key={selectedRoleGroup?.name ?? "new"}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        roleGroup={selectedRoleGroup}
      />
      {confirmDialog}
    </PageShell>
  );
}
