import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ShieldCheck } from "lucide-react";
import { useConfirm } from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SearchInput,
  SkeletonTable,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { Pagination } from "../../../components/layout/pagination";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  type PaginatedSearchQuery,
} from "../../../lib/pagination";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { RoleGroupTable } from "../components/RoleGroupTable";
import { useDeleteRoleGroup, useRoleGroups } from "../hooks/useRoleGroups";
import type { RoleDefinition } from "../types/admin.types";

export function ManageRoleGroupsPage() {
  const navigate = useNavigate();
  const deleteRoleGroup = useDeleteRoleGroup();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);

  const query = useMemo<PaginatedSearchQuery>(
    () => ({ searchTerm: debouncedSearch || undefined, page, limit: rowsPerPage }),
    [debouncedSearch, page, rowsPerPage],
  );

  const { roleGroups, meta, isLoading, isError, refetch } = useRoleGroups(query);
  const totalCount = meta?.totalCount ?? 0;

  function handleSearchChange(value: string): void {
    setSearchQuery(value);
    setPage(1);
  }

  function handleRowsPerPageChange(value: number): void {
    setRowsPerPage(value);
    setPage(1);
  }

  function openEdit(roleGroup: RoleDefinition): void {
    void navigate(`/manage-role-groups/${encodeURIComponent(roleGroup.name)}/edit`);
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
          <NavButton icon={Plus} to="/manage-role-groups/new">
            เพิ่มกลุ่มสิทธิ์
          </NavButton>
        }
        title="จัดการกลุ่มผู้ใช้งาน"
        description="กำหนดกลุ่มสิทธิ์และแมปสิทธิ์การใช้งานของแต่ละตำแหน่ง"
      >
        <ToolbarControls>
          <SearchInput
            onChange={handleSearchChange}
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
        <>
          <RoleGroupTable
            onDelete={handleDelete}
            onEdit={openEdit}
            roleGroups={roleGroups}
          />
          {roleGroups.length > 0 ? (
            <Pagination
              onPageChange={setPage}
              onRowsPerPageChange={handleRowsPerPageChange}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={PAGE_SIZE_OPTIONS}
              totalCount={totalCount}
              unitLabel="กลุ่ม"
            />
          ) : null}
        </>
      )}

      {confirmDialog}
    </PageShell>
  );
}
