import { useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { FormErrorAlert } from "../../../components/base";
import { useGlobalSchoolFilter } from "../../school-filter/hooks/useGlobalSchoolFilter";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useRememberedState } from "../../../hooks/useRememberedState";
import {
  readPositiveIntegerSearchParam,
  readSortSearchParam,
  serializeSortSearchParam,
  useSyncedSearchParams,
} from "../../../hooks/useSyncedSearchParams";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  PageShell,
  ListPageToolbar,
  SkeletonTable,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { PAGE_IDENTITIES } from "../../../components/layout/page-identity";
import { Pagination } from "../../../components/layout/pagination";
import { useContextualNavigate } from "../../../components/layout/navigation-context";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { getApiErrorMessage } from "../../../lib/api-error";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { AccountDeactivationDialog } from "../components/AccountDeactivationDialog";
import { UserTable } from "../components/UserTable";
import type { DataTableSortState } from "../../../components/layout/data-table";
import {
  useDeactivateAccount,
  useRolesCatalog,
  useUsers,
} from "../hooks/useUsers";
import {
  getManageUserPath,
  getUserDisplayName,
} from "../lib/admin-presentation";
import type {
  AccountDeactivationPayload,
  ManagedUser,
} from "../types/admin.types";

const MANAGE_USERS_ICON = PAGE_IDENTITIES["/manage-users"].icon;

/**
 * Teachers moved to จัดการข้อมูลครู and student accounts were retired, so this
 * page covers staff accounts only — ผู้บริหาร, ผอ. and ผู้ดูแลระบบ.
 */
const NON_STAFF_ROLES = "TEACHER,STUDENT";

export function ManageUsersPage({
  scope = "school",
}: {
  /**
   * "council" is the เมนูส่วนสภา entry point — an overview across every
   * school the account can see, not one school's own staff list, so it
   * ignores whatever the header's global school filter currently has picked
   * (owner, 2026-09-22: "มันไม่ใช่กลุ่มผู้ใช้ของ รร สักหน่อย" — it shouldn't
   * need a school picked at all).
   */
  scope?: "school" | "council";
} = {}) {
  const contextualNavigate = useContextualNavigate();
  const [searchParams] = useSearchParams();
  const currentUserId = useAuthSessionStore((state) => state.user?.id ?? null);
  const deactivateAccount = useDeactivateAccount();

  const [searchQuery, setSearchQuery] = useRememberedState(
    "manage-users:search",
    "",
  );
  const [page, setPage] = useState(() =>
    readPositiveIntegerSearchParam(searchParams, "page", 1),
  );
  const [rowsPerPage, setRowsPerPage] = useState<number>(() => {
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
  const [roleLabel, setRoleLabel] = useState(
    () => searchParams.get("role") ?? "",
  );
  const { rolesCatalog } = useRolesCatalog();
  const [sort, setSort] = useState<DataTableSortState | undefined>(() =>
    readSortSearchParam(searchParams, "sort", ["name", "role", "affiliation"]),
  );
  const [deactivationTarget, setDeactivationTarget] =
    useState<ManagedUser | null>(null);
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);
  // Staff accounts are spread across every school an admin oversees — this
  // list narrows by the same header filter as every other list in the app.
  // Leaving it unset browses every school in the admin's own scope.
  const globalFilter = useGlobalSchoolFilter();
  const selectedSchoolValue = scope === "council" ? "" : globalFilter.schoolId;
  // A school switch (from the header, or anywhere else) can leave the page
  // number past the end of the new list.
  const [lastSchoolValue, setLastSchoolValue] = useState(selectedSchoolValue);
  if (selectedSchoolValue !== lastSchoolValue) {
    setLastSchoolValue(selectedSchoolValue);
    if (page !== 1) setPage(1);
  }

  // บทบาท choices are the menu groups of the realm being listed — the
  // selected school's own groups, or the council's — deduplicated by the label
  // the table shows, never a hardcoded list.
  const roleLabelOptions = useMemo(() => {
    const schoolId = Number(selectedSchoolValue) || null;
    const labels = rolesCatalog
      .filter((role) => !NON_STAFF_ROLES.split(",").includes(role.name))
      .filter((role) =>
        scope === "council"
          ? role.school_id == null
          : schoolId !== null && role.school_id === schoolId,
      )
      .map((role) => role.label);
    return Array.from(new Set(labels)).sort((a, b) => a.localeCompare(b, "th"));
  }, [rolesCatalog, scope, selectedSchoolValue]);

  useSyncedSearchParams({
    role: roleLabel || undefined,
    page: page > 1 ? page : undefined,
    limit: rowsPerPage !== DEFAULT_PAGE_SIZE ? rowsPerPage : undefined,
    sort: serializeSortSearchParam(sort),
  });

  const query = useMemo(
    () => ({
      searchTerm: debouncedSearch || undefined,
      realm: scope,
      schoolId: selectedSchoolValue || undefined,
      excludeRole: NON_STAFF_ROLES,
      roleLabel: roleLabel || undefined,
      page,
      limit: rowsPerPage,
      sortBy: sort?.key as "name" | "role" | "affiliation" | undefined,
      sortOrder: sort?.direction,
    }),
    [
      debouncedSearch,
      page,
      roleLabel,
      rowsPerPage,
      scope,
      selectedSchoolValue,
      sort,
    ],
  );

  const { users, meta, isLoading, isError, refetch } = useUsers(query);

  function handleSearchChange(value: string): void {
    setSearchQuery(value);
    setPage(1);
  }

  function openEdit(user: ManagedUser): void {
    if (user.id == null) return;
    contextualNavigate(
      user.id === currentUserId
        ? getManageUserPath(user, "/edit?returnTo=%2Fprofile")
        : getManageUserPath(user, "/edit"),
    );
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

  // เหมือนหน้าอื่นๆ (TeachersPage, StudentListPage): เมนูฝั่งโรงเรียนแยกทีละ
  // โรงเรียน ไม่ปนกันหลายโรงเรียน — ต้องเลือกก่อนถึงเห็น/เพิ่มได้ (owner,
  // 2026-09-22). ฝั่งสภาไม่ใช้กติกานี้เลย ("ไม่ต้องเลือก รร จะเห็นผู้ใช้ของ
  // สภา ไม่ใช่ของ รร").
  const needsSchoolPick = scope === "school" && !selectedSchoolValue;
  const addUserPath =
    scope === "council"
      ? "/council/manage-users/new"
      : `/manage-users/new${
          selectedSchoolValue ? `?schoolId=${selectedSchoolValue}` : ""
        }`;

  return (
    <PageShell>
      <ListPageToolbar
        actions={
          <NavButton
            contextual
            disabled={needsSchoolPick}
            icon={UserPlus}
            to={addUserPath}
          >
            เพิ่มผู้ใช้งาน
          </NavButton>
        }
        description="เพิ่ม แก้ไข และกำหนดสิทธิ์ผู้ใช้งานในระบบ"
        icon={MANAGE_USERS_ICON}
        search={{
          after: (
            <FilterSelect
              ariaLabel="กรองตามบทบาท"
              disabled={needsSchoolPick}
              onChange={(value) => {
                setRoleLabel(value);
                setPage(1);
              }}
              value={roleLabel}
            >
              <option value="">ทุกบทบาท</option>
              {roleLabelOptions.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </FilterSelect>
          ),
          onChange: handleSearchChange,
          placeholder: "ค้นหา",
          value: searchQuery,
        }}
        title="จัดการผู้ใช้งาน"
      />

      <FormErrorAlert
        error={deactivateAccount.error}
        fallback="ปิดใช้งานบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง"
      />

      {needsSchoolPick ? (
        <EmptyState
          description="เลือกโรงเรียนจากแถบด้านบนเพื่อแสดงรายชื่อผู้ใช้งาน"
          icon={MANAGE_USERS_ICON}
          title="เลือกโรงเรียน"
        />
      ) : isError ? (
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
            debouncedSearch || roleLabel
              ? "ลองเปลี่ยนคำค้นหาหรือบทบาท เพื่อดูรายการทั้งหมด"
              : "เพิ่มผู้ใช้งานแรกเพื่อเริ่มต้น"
          }
          icon={MANAGE_USERS_ICON}
          title={
            debouncedSearch || roleLabel
              ? "ไม่พบผู้ใช้งานที่ค้นหา"
              : "ไม่พบผู้ใช้งาน"
          }
        />
      ) : (
        <>
          <UserTable
            currentUserId={currentUserId}
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
