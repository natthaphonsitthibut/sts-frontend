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
  PageShell,
  PageToolbar,
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
import { useScopedSchools } from "../../school-structure/hooks/useSchoolStructure";
import { TeacherTable } from "../components/TeacherTable";
import type { DataTableSortState } from "../../../components/layout/data-table";
import {
  useDeactivateTeacher,
  useTeacherProfiles,
  useTeachers,
} from "../hooks/useTeachers";
import type {
  TeacherDirectoryItem,
  TeacherListQuery,
} from "../types/teachers.types";
import { useGlobalSchoolFilter } from "../../school-filter/hooks/useGlobalSchoolFilter";

const TEACHERS_ICON = PAGE_IDENTITIES["/teachers"].icon;

export function TeachersPage({ mode = "view" }: { mode?: "view" | "manage" }) {
  const management = mode === "manage";
  const contextualNavigate = useContextualNavigate();
  const deactivateTeacher = useDeactivateTeacher();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const schoolsQuery = useScopedSchools();
  const schools = useMemo(() => schoolsQuery.data ?? [], [schoolsQuery.data]);

  const [searchParams] = useSearchParams();
  const globalFilter = useGlobalSchoolFilter();
  const [searchQuery, setSearchQuery] = useRememberedState(
    "teachers:search",
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
  const [sort, setSort] = useState<DataTableSortState | undefined>(() =>
    readSortSearchParam(searchParams, "sort", [
      "name",
      "phone",
      "lineId",
      "email",
    ]),
  );

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);
  // A single-school account never sees the filter — its one school is implied.
  // Falls back to the one school on offer even before it's explicitly picked
  // in the header — same "not a real choice" collapse every other scope
  // picker in the app already applies.
  const selectedSchoolValue =
    globalFilter.schoolId ||
    (schools.length === 1 ? String(schools[0].id) : "");
  const selectedSchoolId = Number(selectedSchoolValue) || null;
  // A school switch (from the header, or anywhere else) can leave the page
  // number past the end of the new list. `selectedSchoolId` depends on the
  // async `schoolsQuery` single-school fallback, so this must not fire on
  // the first value it observes (the school settling in on mount, not a
  // switch) — that would wipe `?page=` restored from the URL on refresh.
  const [lastSchoolId, setLastSchoolId] = useState<number | null | undefined>(
    undefined,
  );
  if (schoolsQuery.isSuccess && selectedSchoolId !== lastSchoolId) {
    const isFirstObservation = lastSchoolId === undefined;
    setLastSchoolId(selectedSchoolId);
    if (!isFirstObservation && page !== 1) setPage(1);
  }

  useSyncedSearchParams({
    page: page > 1 ? page : undefined,
    limit: rowsPerPage !== DEFAULT_PAGE_SIZE ? rowsPerPage : undefined,
    sort: serializeSortSearchParam(sort),
  });

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

  const managementQuery = useTeachers(management ? query : null);
  const directoryQuery = useTeacherProfiles(management ? null : query);
  const { teachers, meta, isLoading, isError, refetch } = management
    ? managementQuery
    : directoryQuery;

  function handleSearchChange(value: string): void {
    setSearchQuery(value);
    setPage(1);
  }

  function openEdit(teacher: TeacherDirectoryItem): void {
    contextualNavigate(`/manage-teachers/${teacher.id}/edit`);
  }

  function openProfile(teacher: TeacherDirectoryItem): void {
    contextualNavigate(`/teachers/${teacher.id}`);
  }

  async function handleDeactivate(
    teacher: TeacherDirectoryItem,
  ): Promise<void> {
    const confirmed = await confirm({
      title: "ปิดใช้งานข้อมูลครู",
      description: `ต้องการปิดใช้งาน “${teacher.fullName}” ใช่หรือไม่? ประวัติการสอนและการเช็กชื่อเดิมจะยังคงอยู่`,
      confirmText: "ปิดใช้งาน",
      variant: "destructive",
    });
    if (confirmed) deactivateTeacher.mutate({ id: teacher.id });
  }

  return (
    <PageShell>
      <PageToolbar
        actions={
          management ? (
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
          ) : undefined
        }
        description={
          management
            ? "เพิ่ม แก้ไข และดูแลข้อมูลคุณครูของโรงเรียน"
            : "ดูข้อมูลและช่องทางติดต่อคุณครูของโรงเรียน"
        }
        icon={TEACHERS_ICON}
        title={management ? "จัดการข้อมูลครู" : "รายชื่อครู"}
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
      ) : !selectedSchoolId ? (
        <EmptyState
          description="เลือกโรงเรียนจากแถบด้านบนเพื่อแสดงรายชื่อคุณครู"
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
              : management
                ? "เพิ่มข้อมูลคุณครูคนแรกเพื่อเริ่มต้น"
                : "ยังไม่มีข้อมูลคุณครูในโรงเรียนนี้"
          }
          icon={TEACHERS_ICON}
          title={
            debouncedSearch ? "ไม่พบคุณครูที่ค้นหา" : "ยังไม่มีข้อมูลคุณครู"
          }
        />
      ) : (
        <>
          <TeacherTable
            deactivatingTeacherId={
              deactivateTeacher.isPending
                ? deactivateTeacher.variables?.id
                : null
            }
            onDeactivate={(teacher) => void handleDeactivate(teacher)}
            onEdit={openEdit}
            onView={openProfile}
            management={management}
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
