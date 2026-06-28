import { useMemo, useState } from "react";
import { UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  EmptyState,
  ErrorState,
  PageShell,
  SkeletonTable,
} from "../../../components/layout/page-primitives";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { SchoolAreaSchoolFilter } from "../../attendance/components/SchoolAreaSchoolFilter";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { StudentSearchFilter } from "../components/StudentSearchFilter";
import { StudentTable } from "../components/StudentTable";
import { useStudentFilterOptions, useStudents } from "../hooks/useStudents";
import type { StudentListQuery } from "../types/students.types";

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_ROWS_PER_PAGE = 20;

export function StudentListPage() {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [grade, setGrade] = useState("ALL");
  const [room, setRoom] = useState("ALL");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_ROWS_PER_PAGE);
  const schoolArea = useSchoolAreaFilter();
  const scope = useScopeCascade({ lockToActorScope: true });

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);

  // Server is the source of truth for filtering, sorting and the page slice.
  const query = useMemo<StudentListQuery>(
    () => ({
      schoolId: scope.schoolId || undefined,
      grade,
      room,
      searchTerm: debouncedSearch || undefined,
      page,
      limit: rowsPerPage,
    }),
    [scope.schoolId, grade, room, debouncedSearch, page, rowsPerPage],
  );

  const { students, meta, isLoading, isError, refetch } = useStudents(query);
  const { options } = useStudentFilterOptions({
    schoolId: scope.schoolId || undefined,
    grade,
  });

  const totalCount = meta?.totalCount ?? 0;

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
    setPage(1);
  }

  function handleRoomChange(value: string): void {
    setRoom(value);
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
      <StudentSearchFilter
        count={totalCount}
        grade={grade}
        gradeOptions={options.grades}
        onGradeChange={handleGradeChange}
        onRefresh={refetch}
        onRoomChange={handleRoomChange}
        onSearchChange={handleSearchChange}
        schoolFilters={
          <SchoolAreaSchoolFilter
            area={schoolArea}
            onSchoolChange={handleSchoolChange}
            schoolId={scope.schoolId}
            schoolLocked={scope.schoolLocked}
          />
        }
        room={room}
        roomOptions={options.rooms}
        searchQuery={searchQuery}
      />

      {isError ? (
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
