import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { FormErrorAlert, useConfirm } from "../../../components/base";
import { NavButton } from "../../../components/layout/nav-button";
import { PAGE_IDENTITIES } from "../../../components/layout/page-identity";
import { Pagination } from "../../../components/layout/pagination";
import { useContextualNavigate } from "../../../components/layout/navigation-context";
import {
  EmptyState,
  ErrorState,
  FilterCombobox,
  PageShell,
  PageToolbar,
  SearchInput,
  SkeletonTable,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { useScopedSchools } from "../../school-structure/hooks/useSchoolStructure";
import { TeacherTable } from "../components/TeacherTable";
import type { DataTableSortState } from "../../../components/layout/data-table";
import { useDeactivateTeacher, useTeachers } from "../hooks/useTeachers";
import type { Teacher, TeacherListQuery } from "../types/teachers.types";

const TEACHERS_ICON = PAGE_IDENTITIES["/manage-teachers"].icon;

export function TeachersPage() {
  const contextualNavigate = useContextualNavigate();
  const deactivateTeacher = useDeactivateTeacher();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const schoolsQuery = useScopedSchools();
  const schools = useMemo(() => schoolsQuery.data ?? [], [schoolsQuery.data]);

  // Kept in the URL, not component state: returning from the add/edit form
  // remounts this page, and a local value would drop the chosen school and send
  // a multi-school user back to the picker.
  const [searchParams, setSearchParams] = useSearchParams();
  const schoolInput = searchParams.get("schoolId") ?? "";
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<DataTableSortState | undefined>();

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);
  // A single-school account never sees the filter — its one school is implied.
  const selectedSchoolValue =
    schools.length === 1 ? String(schools[0].id) : schoolInput;
  const selectedSchoolId = Number(selectedSchoolValue) || null;
  const multipleSchools = schools.length > 1;

  const query = useMemo<TeacherListQuery | null>(
    () =>
      selectedSchoolId
        ? {
            schoolId: selectedSchoolId,
            searchTerm: debouncedSearch || undefined,
            teacherStatus: "ACTIVE",
            sortBy: sort?.key as TeacherListQuery["sortBy"],
            sortOrder: sort?.direction,
            page,
            limit: rowsPerPage,
          }
        : null,
    [debouncedSearch, page, rowsPerPage, selectedSchoolId, sort],
  );

  const { teachers, meta, isLoading, isError, refetch } = useTeachers(query);

  function handleSearchChange(value: string): void {
    setSearchQuery(value);
    setPage(1);
  }

  function handleSchoolChange(value: string): void {
    setSearchParams(
      (params) => {
        if (value) params.set("schoolId", value);
        else params.delete("schoolId");
        return params;
      },
      { replace: true },
    );
    setPage(1);
  }

  function openEdit(teacher: Teacher): void {
    contextualNavigate(`/manage-teachers/${teacher.id}/edit`);
  }

  async function handleDeactivate(teacher: Teacher): Promise<void> {
    const confirmed = await confirm({
      title: "ปิดใช้งานข้อมูลครู",
      description: `ต้องการปิดใช้งาน “${teacher.fullName}” ใช่หรือไม่? ประวัติการสอนและการเช็คชื่อเดิมจะยังคงอยู่`,
      confirmText: "ปิดใช้งาน",
      variant: "destructive",
    });
    if (confirmed) deactivateTeacher.mutate({ id: teacher.id });
  }

  return (
    <PageShell>
      <PageToolbar
        actions={
          <NavButton
            contextual
            disabled={!selectedSchoolId}
            icon={Plus}
            to={`/manage-teachers/new${
              selectedSchoolId ? `?schoolId=${selectedSchoolId}` : ""
            }`}
          >
            เพิ่มข้อมูล
          </NavButton>
        }
        description="เพิ่ม แก้ไข และดูแลข้อมูลคุณครูของโรงเรียน"
        icon={TEACHERS_ICON}
        title="จัดการข้อมูลคุณครู"
      />
      <ToolbarControls className="mb-8">
        <SearchInput
          className="sm:max-w-[560px]"
          onChange={handleSearchChange}
          placeholder="ค้นหา"
          value={searchQuery}
        />
        {multipleSchools ? (
          <FilterCombobox
            ariaLabel="กรองตามโรงเรียน"
            emptyText="ไม่พบโรงเรียน"
            onChange={handleSchoolChange}
            options={schools.map((school) => ({
              value: String(school.id),
              label: school.name,
            }))}
            placeholder="เลือกโรงเรียน"
            value={selectedSchoolValue}
          />
        ) : null}
      </ToolbarControls>

      <FormErrorAlert
        error={deactivateTeacher.error}
        fallback="ปิดใช้งานข้อมูลครูไม่สำเร็จ กรุณาลองอีกครั้ง"
      />

      {schoolsQuery.isError ? (
        <ErrorState
          description="ไม่สามารถโหลดข้อมูลโรงเรียนที่จำเป็นสำหรับหน้านี้ได้"
          onRetry={() => void schoolsQuery.refetch()}
          title="โหลดข้อมูลไม่สำเร็จ"
        />
      ) : schoolsQuery.isLoading ? (
        <SkeletonTable />
      ) : schools.length === 0 ? (
        <EmptyState
          description="บัญชีนี้ยังไม่มีโรงเรียนที่อยู่ในขอบเขตการดูแล"
          icon={TEACHERS_ICON}
          title="ไม่พบโรงเรียนในขอบเขต"
        />
      ) : multipleSchools && !selectedSchoolId ? (
        <EmptyState
          description="เลือกโรงเรียนจากตัวกรองด้านบนเพื่อแสดงรายชื่อคุณครู"
          icon={TEACHERS_ICON}
          title="เลือกโรงเรียน"
        />
      ) : isError ? (
        <ErrorState
          description="เกิดข้อผิดพลาดระหว่างโหลดรายชื่อคุณครู"
          onRetry={refetch}
          title="ไม่สามารถโหลดข้อมูลครูได้"
        />
      ) : isLoading ? (
        <SkeletonTable />
      ) : teachers.length === 0 ? (
        <EmptyState
          description={
            debouncedSearch
              ? "ลองเปลี่ยนคำค้นหา หรือเคลียร์ช่องค้นหาเพื่อดูรายการทั้งหมด"
              : "เพิ่มข้อมูลคุณครูคนแรกเพื่อเริ่มต้น"
          }
          icon={TEACHERS_ICON}
          title={debouncedSearch ? "ไม่พบคุณครูที่ค้นหา" : "ยังไม่มีข้อมูลคุณครู"}
        />
      ) : (
        <>
          <TeacherTable
            deactivatingTeacherId={
              deactivateTeacher.isPending ? deactivateTeacher.variables?.id : null
            }
            onDeactivate={(teacher) => void handleDeactivate(teacher)}
            onEdit={openEdit}
            onSortChange={(nextSort) => {
              setSort(nextSort);
              setPage(1);
            }}
            sort={sort}
            startIndex={(page - 1) * rowsPerPage + 1}
            teachers={teachers}
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

      {confirmDialog}
    </PageShell>
  );
}
