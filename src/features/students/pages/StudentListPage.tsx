import { useMemo, useState } from "react";
import { FileDown, Plus, UserRound } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Tabs } from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  ListPageToolbar,
  PageShell,
  SkeletonTable,
} from "../../../components/layout/page-primitives";
import { useContextualNavigate } from "../../../components/layout/navigation-context";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useRememberedState } from "../../../hooks/useRememberedState";
import { useRouteTab } from "../../../hooks/useRouteTab";
import {
  readPositiveIntegerSearchParam,
  useSyncedSearchParams,
} from "../../../hooks/useSyncedSearchParams";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { ScopeFilterField } from "../../attendance/components/ScopeFilterField";
import {
  SCOPE_ALL_LABEL,
  type ScopeSummaryInput,
} from "../../../lib/scope-presentation";
import { useGlobalSchoolFilter } from "../../school-filter/hooks/useGlobalSchoolFilter";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { AuditLogPanel } from "../../audit-log/components/AuditLogPanel";
import { buildDataExportContextUrl } from "../../data-exports/lib/data-export-context";
import { useStudentStatuses } from "../../student-statuses/hooks/useStudentStatuses";
import { PiiExportPanel } from "../components/PiiExportPanel";
import { StudentSearchFilter } from "../components/StudentSearchFilter";
import { StudentTable } from "../components/StudentTable";
import { useStudentFilterOptions, useStudents } from "../hooks/useStudents";
import type {
  StudentEnrollmentState,
  StudentListItem,
  StudentListQuery,
  StudentStatusFilterValue,
} from "../types/students.types";

const STUDENT_TAB_ROUTES = {
  list: "/manage-students",
  history: "/manage-students/history",
  export: "/manage-students/export",
} as const;

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_ROWS_PER_PAGE = 20;
const ALL_STUDENT_STATUSES = "ALL";

export function StudentListPage({
  mode = "view",
}: {
  mode?: "view" | "manage";
}) {
  const management = mode === "manage";
  const navigate = useNavigate();
  const contextualNavigate = useContextualNavigate();
  const [searchParams] = useSearchParams();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useRouteTab(STUDENT_TAB_ROUTES, "list");
  const canViewAuditLog = can("audit-log");
  const effectiveTab = !management
    ? "list"
    : activeTab === "history" && canViewAuditLog
      ? "history"
      : activeTab === "export"
        ? "export"
        : "list";
  const tabOptions = [
    { value: "list", label: "รายชื่อ" },
    { value: "export", label: "ส่งออกข้อมูล" },
    ...(canViewAuditLog ? [{ value: "history", label: "ประวัติ" }] : []),
  ];

  const [searchQuery, setSearchQuery] = useRememberedState(
    "student-list:search",
    "",
  );
  const [grade, setGrade] = useState(() => searchParams.get("grade") || "ALL");
  const [room, setRoom] = useState(() => searchParams.get("room") || "ALL");
  const [studentStatusCode, setStudentStatusCode] = useState<
    StudentStatusFilterValue | undefined
  >(() => searchParams.get("studentStatus") ?? undefined);
  const [page, setPage] = useState(() =>
    readPositiveIntegerSearchParam(searchParams, "page", 1),
  );
  const [rowsPerPage, setRowsPerPage] = useState<number>(() => {
    const value = readPositiveIntegerSearchParam(
      searchParams,
      "limit",
      DEFAULT_ROWS_PER_PAGE,
    );
    return ROWS_PER_PAGE_OPTIONS.includes(
      value as (typeof ROWS_PER_PAGE_OPTIONS)[number],
    )
      ? value
      : DEFAULT_ROWS_PER_PAGE;
  });
  const [selectedStudentsById, setSelectedStudentsById] = useState<
    Map<string, StudentListItem>
  >(() => new Map());
  const globalFilter = useGlobalSchoolFilter();
  const scope = useScopeCascade({
    lockToActorScope: true,
    controlledSchoolId: globalFilter.schoolId,
    initialGrade: searchParams.get("grade") || undefined,
    initialRoom: searchParams.get("room") || undefined,
  });
  // This page's own grade/room/page/selection are separate from
  // `useScopeCascade`'s internal state (they use their own "ALL" sentinel,
  // not `scope.grade`/`scope.room`) — a school switch from the header must
  // reset them too, the same as the removed local school-change handler did.
  const [lastSchoolIdForReset, setLastSchoolIdForReset] = useState(
    scope.schoolId,
  );
  if (scope.schoolId !== lastSchoolIdForReset) {
    setLastSchoolIdForReset(scope.schoolId);
    if (grade !== "ALL") setGrade("ALL");
    if (room !== "ALL") setRoom("ALL");
    if (page !== 1) setPage(1);
    if (selectedStudentsById.size > 0) setSelectedStudentsById(new Map());
  }
  // Only ever used to tell "no schools in this actor's scope at all" apart
  // from "schools exist, just pick one from the header" — the picker itself
  // lives in the header now. Shares the header's own default (no
  // province/district/subDistrict narrowing) query cache entry, so this
  // costs nothing extra beyond the header's own fetch in the common case.
  const schoolArea = useSchoolAreaFilter({ includeLocations: false });
  const studentStatusesQuery = useStudentStatuses({
    page: 1,
    limit: 50,
    sortBy: "sortOrder",
    sortDirection: "asc",
  });

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);
  const studentStatuses = useMemo(
    () => studentStatusesQuery.data?.items ?? [],
    [studentStatusesQuery.data],
  );
  const defaultActiveStatusCode = useMemo(
    () =>
      studentStatuses.find(
        (status) =>
          status.isEnabled &&
          status.category === "STUDYING" &&
          status.isActiveForLogin,
      )?.code ??
      studentStatuses.find(
        (status) => status.isEnabled && status.category === "STUDYING",
      )?.code,
    [studentStatuses],
  );
  const isRequestedStudentStatusValid =
    studentStatusCode === undefined ||
    studentStatusCode === ALL_STUDENT_STATUSES ||
    studentStatuses.some((status) => String(status.code) === studentStatusCode);
  const normalizedStudentStatusCode =
    studentStatusesQuery.isSuccess && !isRequestedStudentStatusValid
      ? undefined
      : studentStatusCode;

  const effectiveStudentStatusCode: StudentStatusFilterValue =
    normalizedStudentStatusCode ??
    (defaultActiveStatusCode ? String(defaultActiveStatusCode) : "ALL");
  const hasResolvedStudentStatusSelection = studentStatusesQuery.isSuccess;
  const queryStudentStatusCode = hasResolvedStudentStatusSelection
    ? effectiveStudentStatusCode
    : undefined;
  const selectedStudentStatus = studentStatuses.find(
    (status) => String(status.code) === effectiveStudentStatusCode,
  );
  const shouldUseAllEnrollment =
    hasResolvedStudentStatusSelection &&
    (effectiveStudentStatusCode === ALL_STUDENT_STATUSES ||
      selectedStudentStatus?.category !== "STUDYING");
  const enrollmentState: StudentEnrollmentState = shouldUseAllEnrollment
    ? "all"
    : "current-active";
  const studentStatusFilterOptions = useMemo(
    () => [
      { value: ALL_STUDENT_STATUSES, label: "รวมพ้นสภาพ" },
      ...studentStatuses.map((status) => ({
        value: String(status.code),
        label: status.labelTh,
      })),
    ],
    [studentStatuses],
  );
  const effectiveGrade = scope.gradeLocked ? scope.grade : grade;
  const effectiveRoom = scope.roomLocked ? scope.room : room;
  // "ALL" is this page's own sentinel for an open level; the summary reads an
  // open level as an empty one. The school/area itself is the global header
  // filter's own display — omitted here so this chip never repeats it.
  const scopeSummary: ScopeSummaryInput = {
    omitPlace: true,
    grade: effectiveGrade === "ALL" ? undefined : effectiveGrade,
    room: effectiveRoom === "ALL" ? undefined : effectiveRoom,
  };
  const selectedSchoolId = scope.schoolId;

  useSyncedSearchParams({
    grade:
      scope.gradeLocked || effectiveGrade === "ALL"
        ? undefined
        : effectiveGrade,
    room:
      scope.roomLocked || effectiveRoom === "ALL" ? undefined : effectiveRoom,
    studentStatus: normalizedStudentStatusCode,
    page: page > 1 ? page : undefined,
    limit: rowsPerPage !== DEFAULT_ROWS_PER_PAGE ? rowsPerPage : undefined,
  });

  // Server is the source of truth for filtering, sorting and the page slice.
  const query = useMemo<StudentListQuery | null>(
    () =>
      selectedSchoolId
        ? {
            schoolId: selectedSchoolId,
            grade: effectiveGrade,
            room: effectiveRoom,
            enrollmentState,
            studentStatusCode: queryStudentStatusCode,
            searchTerm: debouncedSearch || undefined,
            page,
            limit: rowsPerPage,
          }
        : null,
    [
      selectedSchoolId,
      effectiveGrade,
      effectiveRoom,
      enrollmentState,
      queryStudentStatusCode,
      debouncedSearch,
      page,
      rowsPerPage,
    ],
  );

  const { students, meta, isLoading, isError, refetch } = useStudents(query);
  const { options } = useStudentFilterOptions(
    selectedSchoolId
      ? {
          schoolId: selectedSchoolId,
          grade: effectiveGrade,
          studentStatusCode: queryStudentStatusCode,
          enrollmentState,
        }
      : null,
  );

  const totalCount = meta?.totalCount ?? 0;
  const selectedStudents = useMemo(
    () => Array.from(selectedStudentsById.values()),
    [selectedStudentsById],
  );
  const selectedStudentIds = useMemo(
    () => new Set(selectedStudentsById.keys()),
    [selectedStudentsById],
  );
  const selectedGradeLevelId =
    effectiveGrade === "ALL"
      ? null
      : (scope.gradeLevels.find((level) => level.label === effectiveGrade)
          ?.id ?? null);
  const selectedRoomId = effectiveRoom === "ALL" ? undefined : effectiveRoom;
  const filteredRosterExportUrl = buildDataExportContextUrl(
    "student_roster_basic",
    {
      schoolId: selectedSchoolId,
      grade: effectiveGrade === "ALL" ? undefined : effectiveGrade,
      room: effectiveRoom === "ALL" ? undefined : effectiveRoom,
    },
  );

  // Every filter/page-size change resets to page 1 (handlers below), so the page
  // can't exceed the server's range through normal UI; the Pagination control
  // also disables prev/next at the bounds derived from totalCount.
  function handleSearchChange(value: string): void {
    setSearchQuery(value);
    setPage(1);
    clearSelectedStudents();
  }

  function handleGradeChange(value: string): void {
    setGrade(value);
    setRoom("ALL");
    setPage(1);
    clearSelectedStudents();
  }

  function handleRoomChange(value: string): void {
    setRoom(value);
    setPage(1);
    clearSelectedStudents();
  }

  function handleStudentStatusCodeChange(
    value: StudentStatusFilterValue,
  ): void {
    setStudentStatusCode(value);
    setPage(1);
    clearSelectedStudents();
  }

  function handleRowsPerPageChange(value: number): void {
    setRowsPerPage(value);
    setPage(1);
    clearSelectedStudents();
  }

  function handleClearFilters(): void {
    setSearchQuery("");
    setGrade("ALL");
    setRoom("ALL");
    setStudentStatusCode(undefined);
    scope.setGrade("");
    scope.setRoom("");
    setPage(1);
    clearSelectedStudents();
  }

  function openStudent(studentId: string): void {
    contextualNavigate(`/students/${studentId}`);
  }

  function editStudent(studentId: string): void {
    contextualNavigate(`/manage-students/${studentId}/edit`);
  }

  function clearSelectedStudents(): void {
    setSelectedStudentsById(new Map());
  }

  function handleSelectStudent(
    student: StudentListItem,
    selected: boolean,
  ): void {
    setSelectedStudentsById((current) => {
      const next = new Map(current);
      if (selected) {
        next.set(student.id, student);
      } else {
        next.delete(student.id);
      }
      return next;
    });
  }

  function handleSelectAll(
    studentsToToggle: readonly StudentListItem[],
    selected: boolean,
  ): void {
    setSelectedStudentsById((current) => {
      const next = new Map(current);
      for (const student of studentsToToggle) {
        if (selected) {
          next.set(student.id, student);
        } else {
          next.delete(student.id);
        }
      }
      return next;
    });
  }

  return (
    <PageShell>
      {effectiveTab === "list" ? (
        <StudentSearchFilter
          navigation={
            management ? (
              <Tabs
                aria-label="โหมดรายชื่อนักเรียน"
                onChange={setActiveTab}
                options={tabOptions}
                value={effectiveTab}
              />
            ) : undefined
          }
          exportAction={
            management ? (
              <>
                {selectedStudents.length > 0 ? (
                  <Button
                    icon={FileDown}
                    onClick={() => setActiveTab("export")}
                    variant="outline"
                  >
                    ส่งออกที่เลือก ({selectedStudents.length})
                  </Button>
                ) : null}
                {can("export-data") ? (
                  <Button
                    disabled={!selectedSchoolId}
                    icon={FileDown}
                    onClick={() => navigate(filteredRosterExportUrl)}
                    variant="outline"
                  >
                    ส่งออกตามตัวกรองนี้
                  </Button>
                ) : null}
              </>
            ) : undefined
          }
          createAction={
            management ? (
              <Button
                disabled={!selectedSchoolId}
                icon={Plus}
                onClick={() => contextualNavigate("/manage-students/new")}
              >
                เพิ่มนักเรียน
              </Button>
            ) : undefined
          }
          scope={scopeSummary}
          scopeEditable={!scope.gradeLocked || !scope.roomLocked}
          scopeLabel="ชั้น/ห้อง"
          scopeEmptyLabel={`${SCOPE_ALL_LABEL.grade} · ${SCOPE_ALL_LABEL.room}`}
          noSchoolSelected={!scope.gradeLocked && !selectedSchoolId}
          onClearScope={handleClearFilters}
          grade={effectiveGrade}
          gradeLocked={scope.gradeLocked || !selectedSchoolId}
          gradeOptions={options.grades}
          onGradeChange={handleGradeChange}
          onClearFilters={handleClearFilters}
          onRoomChange={handleRoomChange}
          onSearchChange={handleSearchChange}
          onStudentStatusCodeChange={handleStudentStatusCodeChange}
          room={effectiveRoom}
          roomLocked={
            scope.roomLocked || !selectedSchoolId || effectiveGrade === "ALL"
          }
          roomOptions={options.rooms}
          searchQuery={searchQuery}
          studentStatusCode={effectiveStudentStatusCode}
          studentStatusOptions={studentStatusFilterOptions}
          isStudentStatusError={studentStatusesQuery.isError}
          isStudentStatusLoading={studentStatusesQuery.isLoading}
          title={management ? "จัดการข้อมูลนักเรียน" : "รายชื่อนักเรียน"}
        />
      ) : (
        <ListPageToolbar
          navigation={
            <Tabs
              aria-label="โหมดรายชื่อนักเรียน"
              onChange={setActiveTab}
              options={tabOptions}
              value={effectiveTab}
            />
          }
          description={
            effectiveTab === "export"
              ? "ส่งคำขอ อนุมัติ และดาวน์โหลดข้อมูลส่วนบุคคลตามขอบเขตสิทธิ์"
              : "ดูประวัติการเพิ่ม แก้ไข และลบข้อมูลนักเรียนย้อนหลังตามขอบเขตสิทธิ์"
          }
          scope={
            <ScopeFilterField
              emptyLabel={`${SCOPE_ALL_LABEL.grade} · ${SCOPE_ALL_LABEL.room}`}
              label="ชั้น/ห้อง"
              onClear={handleClearFilters}
              scope={scopeSummary}
            />
          }
          icon={UserRound}
          title={
            effectiveTab === "export"
              ? "ส่งออกข้อมูลส่วนบุคคล"
              : "รายชื่อนักเรียน"
          }
        />
      )}

      <div className="space-y-5">
        {schoolArea.isError ? (
          <ErrorState
            description="ไม่สามารถโหลดข้อมูลโรงเรียนที่จำเป็นสำหรับหน้านี้ได้"
            onRetry={() => void schoolArea.refetch()}
            title="โหลดข้อมูลไม่สำเร็จ"
          />
        ) : schoolArea.isLoading ? (
          <SkeletonTable />
        ) : !scope.schoolLocked && schoolArea.filteredSchools.length === 0 ? (
          <EmptyState
            description="บัญชีนี้ยังไม่มีโรงเรียนที่อยู่ในขอบเขตการดูแล"
            icon={UserRound}
            title="ไม่พบโรงเรียนในขอบเขต"
          />
        ) : !selectedSchoolId ? (
          <EmptyState
            description="เลือกโรงเรียนจากแถบด้านบนเพื่อแสดงรายชื่อนักเรียน"
            icon={UserRound}
            title="เลือกโรงเรียน"
          />
        ) : effectiveTab === "export" ? (
          <PiiExportPanel
            gradeLevelId={selectedGradeLevelId}
            roomId={selectedRoomId}
            schoolId={selectedSchoolId}
            selectedStudents={selectedStudents}
            onClearSelectedStudents={clearSelectedStudents}
            totalCount={totalCount}
          />
        ) : effectiveTab === "history" ? (
          <AuditLogPanel
            description="ดูประวัติการเพิ่ม แก้ไข และลบข้อมูลนักเรียนย้อนหลังตามขอบเขตสิทธิ์"
            domain="students"
            schoolId={Number(selectedSchoolId)}
            title="ประวัติข้อมูลนักเรียน"
          />
        ) : studentStatusesQuery.isError ? (
          <ErrorState
            title="ไม่สามารถโหลดสถานะนักเรียนได้"
            description="เกิดข้อผิดพลาดระหว่างโหลดตัวกรองสถานะนักเรียน กรุณาลองใหม่อีกครั้ง"
            onRetry={() => studentStatusesQuery.refetch()}
          />
        ) : isError ? (
          <ErrorState
            title="ไม่สามารถโหลดข้อมูลนักเรียนได้"
            description="เกิดข้อผิดพลาดระหว่างโหลดรายชื่อนักเรียน"
            onRetry={refetch}
          />
        ) : isLoading ? (
          <SkeletonTable />
        ) : students.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title="ไม่พบข้อมูลนักเรียน"
            description="ลองปรับตัวกรอง หรือค้นหาด้วยชื่อนักเรียนอีกครั้ง"
          />
        ) : (
          <StudentTable
            onPageChange={setPage}
            onRowClick={openStudent}
            onEdit={management ? editStudent : undefined}
            onRowsPerPageChange={handleRowsPerPageChange}
            onSelectAll={handleSelectAll}
            onSelectRow={handleSelectStudent}
            page={page}
            rows={students}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            selectedIds={management ? selectedStudentIds : undefined}
            management={management}
            totalCount={totalCount}
          />
        )}
      </div>
    </PageShell>
  );
}
