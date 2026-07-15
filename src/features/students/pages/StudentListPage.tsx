import { useMemo, useState } from "react";
import { FileDown, MapPin, UserRound } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Tabs } from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  ListPageToolbar,
  PageShell,
  SkeletonTable,
} from "../../../components/layout/page-primitives";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { SchoolAreaSchoolFilter } from "../../attendance/components/SchoolAreaSchoolFilter";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { AuditLogPanel } from "../../audit-log/components/AuditLogPanel";
import { buildDataExportContextUrl } from "../../data-exports/lib/data-export-context";
import { useStudentStatuses } from "../../student-statuses/hooks/useStudentStatuses";
import { PiiExportPanel } from "../components/PiiExportPanel";
import { StudentSearchFilter } from "../components/StudentSearchFilter";
import { StudentTable } from "../components/StudentTable";
import { useStudentFilterOptions, useStudents } from "../hooks/useStudents";
import { FIELD_MONITOR_MAP_MAX_STUDENTS } from "../../field-followers/types/field-monitor-map.types";
import type {
  StudentEnrollmentState,
  StudentListItem,
  StudentListQuery,
  StudentStatusFilterValue,
} from "../types/students.types";

const STUDENT_TAB_ROUTES = {
  list: "/students",
  history: "/students/history",
  export: "/students/export",
} as const;

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_ROWS_PER_PAGE = 20;
const ALL_STUDENT_STATUSES = "ALL";

export function StudentListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useRouteTab(STUDENT_TAB_ROUTES, "list");
  const canViewAuditLog = can("audit-log");
  const effectiveTab =
    activeTab === "history" && canViewAuditLog
      ? "history"
      : activeTab === "export"
        ? "export"
        : "list";
  const tabOptions = [
    { value: "list", label: "รายชื่อ" },
    { value: "export", label: "ส่งออกข้อมูล" },
    ...(canViewAuditLog ? [{ value: "history", label: "ประวัติ" }] : []),
  ];

  const [searchQuery, setSearchQuery] = useState("");
  const [grade, setGrade] = useState(() => searchParams.get("grade") || "ALL");
  const [room, setRoom] = useState(() => searchParams.get("room") || "ALL");
  const [studentStatusCode, setStudentStatusCode] =
    useState<StudentStatusFilterValue | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_ROWS_PER_PAGE);
  const [selectedStudentsById, setSelectedStudentsById] = useState<Map<string, StudentListItem>>(
    () => new Map(),
  );
  const schoolArea = useSchoolAreaFilter({
    province: searchParams.get("province") || undefined,
    district: searchParams.get("district") || undefined,
    subDistrict: searchParams.get("subDistrict") || undefined,
  });
  const scope = useScopeCascade({
    lockToActorScope: true,
    initialSchoolId: searchParams.get("schoolId") || undefined,
    initialGrade: searchParams.get("grade") || undefined,
    initialRoom: searchParams.get("room") || undefined,
  });
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
          status.isEnabled && status.category === "ACTIVE" && status.isActiveForLogin,
      )?.code ??
      studentStatuses.find((status) => status.isEnabled && status.category === "ACTIVE")
        ?.code,
    [studentStatuses],
  );
  const effectiveStudentStatusCode: StudentStatusFilterValue =
    studentStatusCode ?? (defaultActiveStatusCode ? String(defaultActiveStatusCode) : "ALL");
  const hasResolvedStudentStatusSelection =
    studentStatusCode !== undefined ||
    defaultActiveStatusCode !== undefined ||
    !studentStatusesQuery.isLoading;
  const queryStudentStatusCode = hasResolvedStudentStatusSelection
    ? effectiveStudentStatusCode
    : undefined;
  const selectedStudentStatus = studentStatuses.find(
    (status) => String(status.code) === effectiveStudentStatusCode,
  );
  const shouldUseAllEnrollment =
    hasResolvedStudentStatusSelection &&
    (effectiveStudentStatusCode === ALL_STUDENT_STATUSES ||
      selectedStudentStatus?.category !== "ACTIVE");
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

  // Server is the source of truth for filtering, sorting and the page slice.
  const query = useMemo<StudentListQuery>(
    () => ({
      schoolId: scope.schoolId || undefined,
      province: schoolArea.province || undefined,
      district: schoolArea.district || undefined,
      subDistrict: schoolArea.subDistrict || undefined,
      grade,
      room,
      enrollmentState,
      studentStatusCode: queryStudentStatusCode,
      searchTerm: debouncedSearch || undefined,
      page,
      limit: rowsPerPage,
    }),
    [
      scope.schoolId,
      schoolArea.province,
      schoolArea.district,
      schoolArea.subDistrict,
      grade,
      room,
      enrollmentState,
      queryStudentStatusCode,
      debouncedSearch,
      page,
      rowsPerPage,
    ],
  );

  const { students, meta, isLoading, isError, refetch } = useStudents(query);
  const { options } = useStudentFilterOptions({
    schoolId: scope.schoolId || undefined,
    province: schoolArea.province || undefined,
    district: schoolArea.district || undefined,
    subDistrict: schoolArea.subDistrict || undefined,
    grade,
    studentStatusCode: queryStudentStatusCode,
    enrollmentState,
  });

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
    grade === "ALL"
      ? null
      : (scope.gradeLevels.find((level) => level.label === grade)?.id ?? null);
  const selectedRoomId = room === "ALL" ? undefined : room;
  const filteredRosterExportUrl = buildDataExportContextUrl(
    "student_roster_basic",
    {
      province: schoolArea.province,
      district: schoolArea.district,
      subDistrict: schoolArea.subDistrict,
      schoolId: scope.schoolId,
      grade: grade === "ALL" ? undefined : grade,
      room: room === "ALL" ? undefined : room,
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

  function handleSchoolChange(value: string): void {
    scope.setSchoolId(value);
    setGrade("ALL");
    setRoom("ALL");
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

  function handleStudentStatusCodeChange(value: StudentStatusFilterValue): void {
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
    schoolArea.setProvince("");
    scope.reset();
    setPage(1);
    clearSelectedStudents();
  }

  function openStudent(studentId: string): void {
    void navigate(`/students/${studentId}`);
  }

  function clearSelectedStudents(): void {
    setSelectedStudentsById(new Map());
  }

  function handleSelectStudent(student: StudentListItem, selected: boolean): void {
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

  function handleSelectAll(studentsToToggle: readonly StudentListItem[], selected: boolean): void {
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
          actions={
            <Tabs
              aria-label="โหมดรายชื่อนักเรียน"
              onChange={setActiveTab}
              options={tabOptions}
              value={effectiveTab}
            />
          }
          exportAction={
            <>
              {can("field-monitor") && selectedStudents.length > 0 ? (
                <Button
                  disabled={selectedStudents.length > FIELD_MONITOR_MAP_MAX_STUDENTS}
                  icon={MapPin}
                  onClick={() =>
                    navigate(
                      `/field-monitor-map?studentUuids=${selectedStudents.map((s) => s.id).join(",")}`,
                    )
                  }
                  title={
                    selectedStudents.length > FIELD_MONITOR_MAP_MAX_STUDENTS
                      ? `ดูบนแผนที่ได้สูงสุด ${FIELD_MONITOR_MAP_MAX_STUDENTS} คน — เอาที่เลือกออกบางส่วนก่อน`
                      : undefined
                  }
                  variant="outline"
                >
                  ดูบนแผนที่ ({selectedStudents.length})
                </Button>
              ) : null}
              {selectedStudents.length > 0 ? (
                <Button icon={FileDown} onClick={() => setActiveTab("export")} variant="outline">
                  ส่งออกที่เลือก ({selectedStudents.length})
                </Button>
              ) : null}
              {can("export-data") ? (
                <Button
                  icon={FileDown}
                  onClick={() => navigate(filteredRosterExportUrl)}
                  variant="outline"
                >
                  ส่งออกตามตัวกรองนี้
                </Button>
              ) : null}
            </>
          }
          grade={grade}
          gradeOptions={options.grades}
          onGradeChange={handleGradeChange}
          onRefresh={refetch}
          onClearFilters={handleClearFilters}
          onRoomChange={handleRoomChange}
          onSearchChange={handleSearchChange}
          onStudentStatusCodeChange={handleStudentStatusCodeChange}
          room={room}
          roomOptions={options.rooms}
          schoolFilters={
            <SchoolAreaSchoolFilter
              area={schoolArea}
              onSchoolChange={handleSchoolChange}
              schoolId={scope.schoolId}
              schoolLocked={scope.schoolLocked}
            />
          }
          searchQuery={searchQuery}
          studentStatusCode={effectiveStudentStatusCode}
          studentStatusOptions={studentStatusFilterOptions}
          isStudentStatusLoading={studentStatusesQuery.isLoading}
        />
      ) : (
        <ListPageToolbar
          actions={
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
          filters={
            <SchoolAreaSchoolFilter
              area={schoolArea}
              onSchoolChange={handleSchoolChange}
              schoolId={scope.schoolId}
              schoolLocked={scope.schoolLocked}
            />
          }
          icon={UserRound}
          title={effectiveTab === "export" ? "ส่งออกข้อมูลส่วนบุคคล" : "รายชื่อนักเรียน"}
        />
      )}

      <div className="space-y-5">
        {effectiveTab === "export" ? (
          <PiiExportPanel
            district={schoolArea.district || undefined}
            gradeLevelId={selectedGradeLevelId}
            province={schoolArea.province || undefined}
            roomId={selectedRoomId}
            schoolId={scope.schoolId || undefined}
            selectedStudents={selectedStudents}
            onClearSelectedStudents={clearSelectedStudents}
            subDistrict={schoolArea.subDistrict || undefined}
            totalCount={totalCount}
          />
        ) : null}

        {effectiveTab === "history" ? (
          <AuditLogPanel
            description="ดูประวัติการเพิ่ม แก้ไข และลบข้อมูลนักเรียนย้อนหลังตามขอบเขตสิทธิ์"
            district={schoolArea.district || undefined}
            domain="students"
            province={schoolArea.province || undefined}
            schoolId={scope.schoolId ? Number(scope.schoolId) : undefined}
            subDistrict={schoolArea.subDistrict || undefined}
            title="ประวัติข้อมูลนักเรียน"
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
            onRowsPerPageChange={handleRowsPerPageChange}
            onSelectAll={handleSelectAll}
            onSelectRow={handleSelectStudent}
            page={page}
            rows={students}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            selectedIds={selectedStudentIds}
            totalCount={totalCount}
          />
        )}
      </div>
    </PageShell>
  );
}
