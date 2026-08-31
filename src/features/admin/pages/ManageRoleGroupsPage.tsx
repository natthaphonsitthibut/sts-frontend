import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button, Combobox, useConfirm } from "../../../components/base";
import type { DataTableSortState } from "../../../components/layout/data-table";
import { PAGE_IDENTITIES } from "../../../components/layout/page-identity";
import { Pagination } from "../../../components/layout/pagination";
import {
  EmptyState,
  ErrorState,
  PageToolbar,
  PageShell,
  SearchInput,
  SkeletonTable,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useRememberedState } from "../../../hooks/useRememberedState";
import {
  readPositiveIntegerSearchParam,
  readSortSearchParam,
  serializeSortSearchParam,
  useSyncedSearchParams,
} from "../../../hooks/useSyncedSearchParams";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { usePermissionCatalog } from "../../auth/hooks/usePermissionCatalog";
import { useScopedSchools } from "../../school-structure/hooks/useSchoolStructure";
import { RoleGroupDialog } from "../components/RoleGroupDialog";
import { RoleGroupTable } from "../components/RoleGroupTable";
import { useDeleteRoleGroup, useRoleGroups } from "../hooks/useRoleGroups";
import { useRolesCatalog } from "../hooks/useUsers";
import type { RoleDefinition, RoleGroupListQuery } from "../types/admin.types";
import {
  formatSchoolArea,
  SCOPE_REQUIRED_LABEL,
} from "../../../lib/scope-presentation";
import { ScopeFilterField } from "../../attendance/components/ScopeFilterField";

const MENU_GROUPS_ICON = PAGE_IDENTITIES["/manage-role-groups"].icon;

export function ManageRoleGroupsPage() {
  const [searchParams] = useSearchParams();
  const deleteRoleGroup = useDeleteRoleGroup();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const schoolsQuery = useScopedSchools();
  const schools = useMemo(() => schoolsQuery.data ?? [], [schoolsQuery.data]);
  const {
    isLoading: rolesCatalogLoading,
    isError: rolesCatalogError,
    refetch: refetchRolesCatalog,
  } = useRolesCatalog();
  const {
    labelOf,
    isLoading: permissionCatalogLoading,
    isError: permissionCatalogError,
    refetch: refetchPermissionCatalog,
  } = usePermissionCatalog();

  const [schoolInput, setSchoolInput] = useState(
    () => searchParams.get("schoolId") ?? "",
  );
  const [searchQuery, setSearchQuery] = useRememberedState(
    "manage-role-groups:search",
    "",
  );
  const [page, setPage] = useState(() =>
    readPositiveIntegerSearchParam(searchParams, "page", 1),
  );
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const value = readPositiveIntegerSearchParam(
      searchParams,
      "limit",
      DEFAULT_PAGE_SIZE,
    );
    return PAGE_SIZE_OPTIONS.includes(
      value as (typeof PAGE_SIZE_OPTIONS)[number],
    )
      ? value
      : DEFAULT_PAGE_SIZE;
  });
  const defaultSort: DataTableSortState = {
    key: "group",
    direction: "asc",
  };
  const [sort, setSort] = useState<DataTableSortState | undefined>(() =>
    readSortSearchParam(searchParams, "sort", ["group", "menus"], defaultSort),
  );
  const [dialogRoleGroup, setDialogRoleGroup] = useState<
    RoleDefinition | null | undefined
  >(undefined);

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);
  const selectedSchoolValue =
    schools.length === 1 ? String(schools[0].id) : schoolInput;
  const selectedSchoolId = Number(selectedSchoolValue) || null;
  const selectedSchool = schools.find(
    (school) => school.id === selectedSchoolId,
  );
  const multipleSchools = schools.length > 1;
  useSyncedSearchParams({
    schoolId: multipleSchools ? schoolInput || undefined : undefined,
    page: page > 1 ? page : undefined,
    limit: rowsPerPage !== DEFAULT_PAGE_SIZE ? rowsPerPage : undefined,
    sort: serializeSortSearchParam(sort, defaultSort),
  });
  const query = useMemo<RoleGroupListQuery | null>(
    () =>
      selectedSchoolId
        ? {
            searchTerm: debouncedSearch || undefined,
            page,
            limit: rowsPerPage,
            schoolId: selectedSchoolId,
            sortBy:
              sort?.key === "menus" ? "menus" : sort ? "group" : undefined,
            sortDirection: sort?.direction,
          }
        : null,
    [debouncedSearch, page, rowsPerPage, selectedSchoolId, sort],
  );

  const { roleGroups, meta, isLoading, isError, refetch } =
    useRoleGroups(query);

  function handleSearchChange(value: string): void {
    setSearchQuery(value);
    setPage(1);
  }

  function handleSchoolChange(value: string): void {
    setSchoolInput(value);
    setPage(1);
    setDialogRoleGroup(undefined);
  }

  function handleSortChange(nextSort: DataTableSortState | undefined): void {
    setSort(nextSort);
    setPage(1);
  }

  async function handleDelete(roleGroup: RoleDefinition): Promise<void> {
    const confirmed = await confirm({
      title: "ลบกลุ่มเมนู",
      description: `ต้องการลบกลุ่มเมนู “${roleGroup.label || roleGroup.name}” ใช่หรือไม่?`,
      confirmText: "ลบ",
      variant: "destructive",
    });
    if (confirmed) deleteRoleGroup.mutate(roleGroup.name);
  }

  return (
    <PageShell>
      <PageToolbar
        actions={
          <Button
            disabled={
              !selectedSchoolId ||
              rolesCatalogLoading ||
              permissionCatalogLoading
            }
            icon={Plus}
            onClick={() => setDialogRoleGroup(null)}
          >
            เพิ่มกลุ่มเมนู
          </Button>
        }
        description="กรอกข้อมูลรายละเอียดผู้ใช้งานและกำหนดสิทธิ์การเข้าถึงระบบ"
        scope={
          <ScopeFilterField
            editable={multipleSchools}
            scope={{ schoolName: selectedSchool?.name }}
          >
            <Combobox
              ariaLabel="กรองตามโรงเรียน"
              emptyText="ไม่พบโรงเรียน"
              onChange={handleSchoolChange}
              options={schools.map((school) => ({
                value: String(school.id),
                label: school.name,
                description: formatSchoolArea(school),
              }))}
              placeholder={SCOPE_REQUIRED_LABEL.school}
              value={selectedSchoolValue}
            />
          </ScopeFilterField>
        }
        title="จัดการกลุ่มเมนู"
      >
        <ToolbarControls>
          <SearchInput
            className="sm:max-w-[560px]"
            onChange={handleSearchChange}
            placeholder="ค้นหา"
            value={searchQuery}
          />
        </ToolbarControls>
      </PageToolbar>

      {schoolsQuery.isError || rolesCatalogError || permissionCatalogError ? (
        <ErrorState
          description="ไม่สามารถโหลดข้อมูลโรงเรียนหรือสิทธิ์ที่จำเป็นสำหรับหน้านี้ได้"
          onRetry={() => {
            void schoolsQuery.refetch();
            refetchRolesCatalog();
            refetchPermissionCatalog();
          }}
          title="โหลดข้อมูลไม่สำเร็จ"
        />
      ) : schoolsQuery.isLoading || permissionCatalogLoading ? (
        <SkeletonTable />
      ) : schools.length === 0 ? (
        <EmptyState
          description="บัญชีนี้ยังไม่มีโรงเรียนที่อยู่ในขอบเขตการดูแล"
          icon={MENU_GROUPS_ICON}
          title="ไม่พบโรงเรียนในขอบเขต"
        />
      ) : multipleSchools && !selectedSchoolId ? (
        <EmptyState
          description="เลือกโรงเรียนจากตัวกรองด้านบนเพื่อแสดงกลุ่มเมนู"
          icon={MENU_GROUPS_ICON}
          title="เลือกโรงเรียน"
        />
      ) : isError ? (
        <ErrorState
          description="เกิดข้อผิดพลาดระหว่างโหลดข้อมูลกลุ่มเมนู"
          onRetry={refetch}
          title="ไม่สามารถโหลดกลุ่มเมนูได้"
        />
      ) : isLoading ? (
        <SkeletonTable />
      ) : (
        <>
          <RoleGroupTable
            labelOf={labelOf}
            onDelete={(roleGroup) => void handleDelete(roleGroup)}
            onEdit={setDialogRoleGroup}
            onSortChange={handleSortChange}
            roleGroups={roleGroups}
            sort={sort}
          />
          {roleGroups.length > 0 ? (
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
              unitLabel="กลุ่ม"
            />
          ) : null}
        </>
      )}

      {dialogRoleGroup !== undefined && selectedSchoolId && selectedSchool ? (
        <RoleGroupDialog
          key={dialogRoleGroup?.name ?? `new-${selectedSchoolId}`}
          onOpenChange={(open) => {
            if (!open) setDialogRoleGroup(undefined);
          }}
          roleGroup={dialogRoleGroup}
          schoolId={selectedSchoolId}
          schoolName={selectedSchool.name}
        />
      ) : null}

      {confirmDialog}
    </PageShell>
  );
}
