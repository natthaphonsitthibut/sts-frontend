import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Users, UserPlus } from "lucide-react";
import { FormErrorAlert, useConfirm } from "../../../components/base";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { SchoolClassRoomFilter } from "../../attendance/components/SchoolClassRoomFilter";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import {
  EmptyState,
  ErrorState,
  ListPageToolbar,
  PageShell,
  SkeletonTable,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { CredentialDialog } from "../../../components/layout/credential-dialog";
import { Pagination } from "../../../components/layout/pagination";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { UserTable } from "../components/UserTable";
import {
  useDeleteUser,
  useReissueStudentTemporaryPassword,
  useUsers,
} from "../hooks/useUsers";
import { getUserDisplayName } from "../lib/admin-presentation";
import type { ManagedUser } from "../types/admin.types";

export function ManageUsersPage() {
  const navigate = useNavigate();
  const deleteUser = useDeleteUser();
  const reissuePassword = useReissueStudentTemporaryPassword();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [generatedPassword, setGeneratedPassword] = useState("");
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
      page,
      rowsPerPage,
    ],
  );

  const { users, meta, isLoading, isError, refetch } = useUsers(query);
  const totalCount = meta?.totalCount ?? 0;

  function handleSearchChange(value: string): void {
    setSearchQuery(value);
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

  async function handleReissueTemporaryPassword(user: ManagedUser): Promise<void> {
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
    <PageShell maxWidthClassName="max-w-[1100px]">
      <ListPageToolbar
        icon={Users}
        tableActions={
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
        filters={
          <SchoolClassRoomFilter
            area={schoolArea}
            onGradeChange={handleGradeChange}
            onRoomChange={handleRoomChange}
            onSchoolChange={handleSchoolChange}
            scope={scope}
          />
        }
      />

      <FormErrorAlert
        error={reissuePassword.error}
        fallback="ออกรหัสชั่วคราวใหม่ไม่สำเร็จ กรุณาลองอีกครั้ง"
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
          <UserTable
            onDelete={handleDelete}
            onEdit={openEdit}
            onReissueTemporaryPassword={handleReissueTemporaryPassword}
            reissuingUserId={reissuePassword.isPending ? reissuePassword.variables : null}
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

      {confirmDialog}
      <CredentialDialog
        description="รหัสใหม่จะแสดงเพียงครั้งเดียวและมีอายุ 7 วัน นักเรียนต้องเปลี่ยนรหัสเมื่อเข้าสู่ระบบครั้งแรก"
        onClose={() => setGeneratedPassword("")}
        open={Boolean(generatedPassword)}
        value={generatedPassword}
      />
    </PageShell>
  );
}
