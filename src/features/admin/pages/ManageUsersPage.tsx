import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  KeyRound,
  Users,
  UserPlus,
  UserX,
} from "lucide-react";
import { FormErrorAlert, Tabs, useConfirm } from "../../../components/base";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { SchoolClassRoomFilter } from "../../attendance/components/SchoolClassRoomFilter";
import { SchoolAreaSchoolFilter } from "../../attendance/components/SchoolAreaSchoolFilter";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  ListPageToolbar,
  PageShell,
  SkeletonTable,
  SummaryMetrics,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { CredentialDialog } from "../../../components/layout/credential-dialog";
import { Pagination } from "../../../components/layout/pagination";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { getApiErrorMessage } from "../../../lib/api-error";
import { AuditLogPanel } from "../../audit-log/components/AuditLogPanel";
import { AccountDeactivationDialog } from "../components/AccountDeactivationDialog";
import { UserTable } from "../components/UserTable";
import {
  useDeactivateAccount,
  useReactivateAccount,
  useReissueTemporaryPassword,
  useUsers,
} from "../hooks/useUsers";
import { getManagedUserLifecycleStatus, getUserDisplayName } from "../lib/admin-presentation";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import type {
  AccountDeactivationPayload,
  ManagedUser,
  AccountLifecycleStatus,
  StudentAccountStatusCounts,
} from "../types/admin.types";

const USER_STATUS_ICONS = {
  PENDING_FIRST_LOGIN: KeyRound,
  ACTIVE: CheckCircle2,
  TEMP_PASSWORD_EXPIRED: Clock,
  DISABLED: UserX,
} as const;

function getFallbackUserStatusCounts(
  users: readonly ManagedUser[],
): StudentAccountStatusCounts {
  return users.reduce<StudentAccountStatusCounts>(
    (counts, user) => {
      const status = getManagedUserLifecycleStatus(user);
      return {
        ...counts,
        [status]: counts[status] + 1,
      };
    },
    {
      PENDING_FIRST_LOGIN: 0,
      ACTIVE: 0,
      TEMP_PASSWORD_EXPIRED: 0,
      DISABLED: 0,
    },
  );
}

export function ManageUsersPage() {
  const navigate = useNavigate();
  const deactivateAccount = useDeactivateAccount();
  const reactivateAccount = useReactivateAccount();
  const reissuePassword = useReissueTemporaryPassword();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useRouteTab(
    {
      manage: "/manage-users",
      history: "/manage-users/history",
    } as const,
    "manage",
  );
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [accountStatus, setAccountStatus] =
    useState<"" | AccountLifecycleStatus>("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [deactivationTarget, setDeactivationTarget] =
    useState<ManagedUser | null>(null);
  const schoolArea = useSchoolAreaFilter();
  const scope = useScopeCascade({ lockToActorScope: true });
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);

  const query = useMemo(
    () => ({
      searchTerm: debouncedSearch || undefined,
      province: schoolArea.province || undefined,
      district: schoolArea.district || undefined,
      subDistrict: schoolArea.subDistrict || undefined,
      schoolId: scope.schoolId || undefined,
      gradeLevelId: scope.gradeLevelId,
      room: scope.room || undefined,
      excludeRole: "STUDENT",
      accountStatus: accountStatus || undefined,
      page,
      limit: rowsPerPage,
    }),
    [
      debouncedSearch,
      schoolArea.province,
      schoolArea.district,
      schoolArea.subDistrict,
      scope.schoolId,
      scope.gradeLevelId,
      scope.room,
      accountStatus,
      page,
      rowsPerPage,
    ],
  );

  const { users, meta, isLoading, isError, refetch, dataUpdatedAt } = useUsers(query);
  const lifecycleCatalog = useStatusCatalog("USER_ACCOUNT_LIFECYCLE");
  const totalCount = meta?.totalCount ?? 0;
  const lifecycleStatusCounts = useMemo(
    () => meta?.lifecycleStatusCounts ?? getFallbackUserStatusCounts(users),
    [meta?.lifecycleStatusCounts, users],
  );
  const lifecycleStatusTotal = useMemo(
    () =>
      lifecycleCatalog.items.reduce(
        (total, item) =>
          total +
          (lifecycleStatusCounts[item.code as keyof StudentAccountStatusCounts] ?? 0),
        0,
      ),
    [lifecycleCatalog.items, lifecycleStatusCounts],
  );

  function handleSearchChange(value: string): void {
    setSearchQuery(value);
    setPage(1);
  }

  function handleAccountStatusChange(value: string): void {
    setAccountStatus(value as "" | AccountLifecycleStatus);
    setPage(1);
  }

  function handleSchoolChange(value: string): void {
    scope.setSchoolId(value);
    setPage(1);
  }

  function handleGradeChange(value: string): void {
    scope.setGrade(value);
    setPage(1);
  }

  function handleRoomChange(value: string): void {
    scope.setRoom(value);
    setPage(1);
  }

  function handleClearFilters(): void {
    setSearchQuery("");
    setAccountStatus("");
    schoolArea.reset();
    scope.reset();
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

  function handleDeactivate(user: ManagedUser): void {
    if (user.id == null) {
      return;
    }
    setDeactivationTarget(user);
  }

  function submitDeactivate(payload: AccountDeactivationPayload): void {
    if (deactivationTarget?.id == null) {
      return;
    }
    deactivateAccount.mutate(
      { id: deactivationTarget.id, payload },
      { onSuccess: () => setDeactivationTarget(null) },
    );
  }

  async function handleReactivate(user: ManagedUser): Promise<void> {
    if (user.id == null) {
      return;
    }
    const confirmed = await confirm({
      title: "เปิดใช้งานผู้ใช้งาน",
      description: `ต้องการเปิดใช้งาน "${getUserDisplayName(user)}" อีกครั้งใช่หรือไม่?`,
      confirmText: "เปิดใช้งาน",
    });
    if (confirmed) {
      reactivateAccount.mutate(user.id);
    }
  }

  async function handleReissueTemporaryPassword(
    user: ManagedUser,
  ): Promise<void> {
    if (user.id == null) {
      return;
    }
    const confirmed = await confirm({
      title: "ออกรหัสชั่วคราวใหม่",
      description: `ต้องการออกรหัสใหม่ให้ "${getUserDisplayName(user)}" ใช่หรือไม่? รหัสเดิมจะใช้ไม่ได้ทันที`,
      confirmText: "ออกรหัสใหม่",
    });
    if (!confirmed) {
      return;
    }
    reissuePassword.mutate(user.id, {
      onSuccess: (result) => setGeneratedPassword(result.tempPassword),
    });
  }

  return (
    <PageShell>
      <ListPageToolbar
        icon={Users}
        actions={<><Tabs aria-label="โหมดจัดการผู้ใช้งาน" onChange={setActiveTab} options={[{ value: "manage", label: "จัดการผู้ใช้งาน" }, { value: "history", label: "ประวัติ" }]} value={activeTab} /><NavButton className="h-12" icon={UserPlus} to="/manage-users/new">เพิ่มผู้ใช้งาน</NavButton></>}
        tableActions={activeTab === "manage" ? <RefreshButton onRefresh={refetch} updatedAt={dataUpdatedAt} /> : undefined}
        onClearFilters={handleClearFilters}
        title="จัดการรายชื่อผู้ใช้งาน"
        description="เพิ่ม แก้ไข และกำหนดสิทธิ์ผู้ใช้งานในระบบ"
        search={
          activeTab === "manage"
            ? {
                value: searchQuery,
                onChange: handleSearchChange,
                placeholder: "ค้นหาชื่อหรือ username...",
              }
            : undefined
        }
        filters={
          activeTab === "manage" ? (
            <>
              <SchoolClassRoomFilter
                area={schoolArea}
                onGradeChange={handleGradeChange}
                onRoomChange={handleRoomChange}
                onSchoolChange={handleSchoolChange}
                scope={scope}
              />
              <FilterSelect
                ariaLabel="สถานะบัญชีผู้ใช้งาน"
                className="sm:w-[220px]"
                onChange={handleAccountStatusChange}
                value={accountStatus}
              >
                <option value="">ทุกสถานะ</option>
                {lifecycleCatalog.items.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </FilterSelect>
            </>
          ) : (
            <SchoolAreaSchoolFilter
              area={schoolArea}
              onSchoolChange={handleSchoolChange}
              schoolId={scope.schoolId}
              schoolLocked={scope.schoolLocked}
            />
          )
        }
      />

      {activeTab === "manage" ? (
        <>
          <FormErrorAlert
            error={reissuePassword.error}
            fallback="ออกรหัสชั่วคราวใหม่ไม่สำเร็จ กรุณาลองอีกครั้ง"
          />
          <FormErrorAlert
            error={reactivateAccount.error}
            fallback="เปิดใช้งานบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง"
          />

          {isError || lifecycleCatalog.isError ? (
            <ErrorState
              title="ไม่สามารถโหลดผู้ใช้งานได้"
              description="เกิดข้อผิดพลาดระหว่างโหลดรายชื่อผู้ใช้งาน"
              onRetry={() => {
                refetch();
                lifecycleCatalog.refetch();
              }}
            />
          ) : isLoading || lifecycleCatalog.isLoading ? (
            <SkeletonTable />
          ) : (
            <div className="space-y-4">
              <SummaryMetrics
                centerRows
                items={[
                  {
                    label: "ทั้งหมด",
                    value: lifecycleStatusTotal,
                    tone: "default",
                    icon: Users,
                    emphasis: true,
                    onSelect: () => handleAccountStatusChange(""),
                    selected: accountStatus === "",
                    selectionLabel: "แสดงผู้ใช้งานทุกสถานะ",
                  },
                  ...lifecycleCatalog.items.map((item) => ({
                    label: item.label,
                    value:
                      lifecycleStatusCounts[item.code as keyof StudentAccountStatusCounts] ?? 0,
                    tone: item.summaryTone ?? "default",
                    icon:
                      USER_STATUS_ICONS[item.code as keyof typeof USER_STATUS_ICONS] ?? Users,
                    onSelect: () =>
                      handleAccountStatusChange(
                        accountStatus === item.code ? "" : item.code,
                      ),
                    selected: accountStatus === item.code,
                    selectionLabel: `${accountStatus === item.code ? "ยกเลิกตัวกรอง" : "กรอง"}${item.label}`,
                  })),
                ]}
              />
              {users.length === 0 ? (
                <EmptyState
                  description={
                    debouncedSearch
                      ? "ลองเปลี่ยนคำค้นหา หรือเคลียร์ช่องค้นหาเพื่อดูรายการทั้งหมด"
                      : "เพิ่มผู้ใช้งานแรกเพื่อเริ่มต้น"
                  }
                  icon={Users}
                  title={
                    debouncedSearch
                      ? "ไม่พบผู้ใช้งานที่ค้นหา"
                      : "ไม่พบผู้ใช้งาน"
                  }
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
                    onReactivate={(user) => void handleReactivate(user)}
                    onReissueTemporaryPassword={handleReissueTemporaryPassword}
                    reactivatingUserId={
                      reactivateAccount.isPending
                        ? reactivateAccount.variables
                        : null
                    }
                    reissuingUserId={
                      reissuePassword.isPending
                        ? reissuePassword.variables
                        : null
                    }
                    users={users}
                  />
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
            </div>
          )}
        </>
      ) : (
        <AuditLogPanel
          description="ดูรายการจัดการผู้ใช้งานย้อนหลังตามขอบเขตสิทธิ์และพื้นที่ที่เลือก"
          district={schoolArea.district || undefined}
          domain="users"
          province={schoolArea.province || undefined}
          schoolId={scope.schoolId ? Number(scope.schoolId) : undefined}
          subDistrict={schoolArea.subDistrict || undefined}
          title="ประวัติผู้ใช้งาน"
        />
      )}

      {confirmDialog}
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
      <CredentialDialog
        description="รหัสใหม่จะแสดงเพียงครั้งเดียวและมีอายุ 7 วัน ผู้ใช้งานต้องเปลี่ยนรหัสเมื่อเข้าสู่ระบบครั้งแรก"
        onClose={() => setGeneratedPassword("")}
        open={Boolean(generatedPassword)}
        value={generatedPassword}
      />
    </PageShell>
  );
}
