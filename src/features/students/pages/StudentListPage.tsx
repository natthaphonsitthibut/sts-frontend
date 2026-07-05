import { useMemo, useState } from "react";
import { UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs } from "../../../components/base";
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
import { PiiExportPanel } from "../components/PiiExportPanel";
import { StudentSearchFilter } from "../components/StudentSearchFilter";
import { StudentTable } from "../components/StudentTable";
import { useStudentFilterOptions, useStudents } from "../hooks/useStudents";
import type { StudentEnrollmentState, StudentListQuery } from "../types/students.types";

const STUDENT_TAB_ROUTES = {
  list: "/students",
  history: "/students/history",
} as const;

const STUDENT_AUDIT_ACTION_OPTIONS = [
  { value: "STUDENT_CREATE", label: "เพิ่มข้อมูลนักเรียน" },
  { value: "STUDENT_UPDATE", label: "แก้ไขข้อมูลนักเรียน" },
  { value: "STUDENT_DELETE", label: "ลบข้อมูลนักเรียน" },
] as const;

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_ROWS_PER_PAGE = 20;

export function StudentListPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useRouteTab(STUDENT_TAB_ROUTES, "list");
  const canViewAuditLog = can("audit-log");
  const effectiveTab = activeTab === "history" && canViewAuditLog ? "history" : "list";

  const [searchQuery, setSearchQuery] = useState("");
  const [grade, setGrade] = useState("ALL");
  const [room, setRoom] = useState("ALL");
  const [enrollmentState, setEnrollmentState] =
    useState<StudentEnrollmentState>("current-active");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_ROWS_PER_PAGE);
  const schoolArea = useSchoolAreaFilter();
  const scope = useScopeCascade({ lockToActorScope: true });

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);

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
    enrollmentState,
  });

  const totalCount = meta?.totalCount ?? 0;
  const selectedGradeLevelId =
    grade === "ALL"
      ? null
      : (scope.gradeLevels.find((level) => level.label === grade)?.id ?? null);
  const selectedRoomId = room === "ALL" ? undefined : room;

  // Every filter/page-size change resets to page 1 (handlers below), so the page
  // can't exceed the server's range through normal UI; the Pagination control
  // also disables prev/next at the bounds derived from totalCount.
  function handleSearchChange(value: string): void {
    setSearchQuery(value);
    setPage(1);
  }

  function handleSchoolChange(value: string): void {
    scope.setSchoolId(value);
    setGrade("ALL");
    setRoom("ALL");
    setPage(1);
  }

  function handleGradeChange(value: string): void {
    setGrade(value);
    setRoom("ALL");
    setPage(1);
  }

  function handleRoomChange(value: string): void {
    setRoom(value);
    setPage(1);
  }

  function handleEnrollmentStateChange(value: StudentEnrollmentState): void {
    setEnrollmentState(value);
    setPage(1);
  }

  function handleRowsPerPageChange(value: number): void {
    setRowsPerPage(value);
    setPage(1);
  }

  function openStudent(studentId: string): void {
    void navigate(`/students/${studentId}`);
  }

  return (
    <PageShell>
      {effectiveTab === "list" ? (
        <StudentSearchFilter
          actions={
            canViewAuditLog ? (
              <Tabs
                aria-label="โหมดรายชื่อนักเรียน"
                onChange={setActiveTab}
                options={[
                  { value: "list", label: "รายชื่อ" },
                  { value: "history", label: "ประวัติ" },
                ]}
                value={activeTab}
              />
            ) : undefined
          }
          count={totalCount}
          enrollmentState={enrollmentState}
          grade={grade}
          gradeOptions={options.grades}
          onEnrollmentStateChange={handleEnrollmentStateChange}
          onGradeChange={handleGradeChange}
          onRefresh={refetch}
          onRoomChange={handleRoomChange}
          onSearchChange={handleSearchChange}
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
        />
      ) : (
        <ListPageToolbar
          actions={
            <Tabs
              aria-label="โหมดรายชื่อนักเรียน"
              onChange={setActiveTab}
              options={[
                { value: "list", label: "รายชื่อ" },
                { value: "history", label: "ประวัติ" },
              ]}
              value={activeTab}
            />
          }
          description="ดูประวัติการเพิ่ม แก้ไข และลบข้อมูลนักเรียนย้อนหลังตามขอบเขตสิทธิ์"
          filters={
            <SchoolAreaSchoolFilter
              area={schoolArea}
              onSchoolChange={handleSchoolChange}
              schoolId={scope.schoolId}
              schoolLocked={scope.schoolLocked}
            />
          }
          icon={UserRound}
          title="รายชื่อนักเรียน"
        />
      )}

      {effectiveTab === "list" ? (
        <PiiExportPanel
          district={schoolArea.district || undefined}
          gradeLevelId={selectedGradeLevelId}
          province={schoolArea.province || undefined}
          roomId={selectedRoomId}
          schoolId={scope.schoolId || undefined}
          subDistrict={schoolArea.subDistrict || undefined}
          totalCount={totalCount}
        />
      ) : null}

      {effectiveTab === "history" ? (
        <AuditLogPanel
          actionOptions={STUDENT_AUDIT_ACTION_OPTIONS}
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
          page={page}
          rows={students}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          totalCount={totalCount}
        />
      )}
    </PageShell>
  );
}
