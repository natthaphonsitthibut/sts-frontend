import { useMemo, useState } from "react";
import { UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  EmptyState,
  ErrorState,
  PageShell,
  SkeletonTable,
} from "../../../components/layout/page-primitives";
import { StudentSearchFilter } from "../components/StudentSearchFilter";
import { StudentTable } from "../components/StudentTable";
import { useStudents } from "../hooks/useStudents";
import type { StudentListItem } from "../types/students.types";

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_ROWS_PER_PAGE = 20;

function distinctSorted(
  values: Array<string | undefined>,
  numeric = false,
): string[] {
  const unique = Array.from(
    new Set(values.filter((value): value is string => Boolean(value && value !== "0"))),
  );
  return unique.sort((left, right) =>
    numeric
      ? Number(left) - Number(right)
      : left.localeCompare(right, "th", { sensitivity: "base" }),
  );
}

export function StudentListPage() {
  const navigate = useNavigate();
  const { students, isLoading, isError, refetch } = useStudents();

  const [searchQuery, setSearchQuery] = useState("");
  const [grade, setGrade] = useState("ALL");
  const [room, setRoom] = useState("ALL");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_ROWS_PER_PAGE);

  const gradeOptions = useMemo(
    () => distinctSorted(students.map((student) => student.grade)),
    [students],
  );
  const roomOptions = useMemo(
    () => distinctSorted(
      students.map((student) => student.room),
      true,
    ),
    [students],
  );

  const filteredStudents = useMemo<StudentListItem[]>(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return students
      .filter((student) => {
        if (grade !== "ALL" && student.grade !== grade) {
          return false;
        }
        if (room !== "ALL" && String(student.room) !== room) {
          return false;
        }
        if (!normalizedSearch) {
          return true;
        }
        return (
          student.name.toLowerCase().includes(normalizedSearch) ||
          String(student.id).includes(normalizedSearch)
        );
      })
      .sort((left, right) =>
        left.name.localeCompare(right.name, "th", { sensitivity: "base" }),
      );
  }, [students, grade, room, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / rowsPerPage),
  );

  // Derive (never store) the in-bounds page so a shrinking result set can't
  // strand us on an empty page.
  const currentPage = Math.min(page, totalPages);

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredStudents.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredStudents, currentPage, rowsPerPage]);

  // Changing a filter or page size resets back to the first page.
  function handleSearchChange(value: string): void {
    setSearchQuery(value);
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
        count={filteredStudents.length}
        grade={grade}
        gradeOptions={gradeOptions}
        onGradeChange={handleGradeChange}
        onRoomChange={handleRoomChange}
        onSearchChange={handleSearchChange}
        room={room}
        roomOptions={roomOptions}
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
      ) : filteredStudents.length === 0 ? (
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
          page={currentPage}
          rows={paginatedStudents}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          totalCount={filteredStudents.length}
        />
      )}
    </PageShell>
  );
}
