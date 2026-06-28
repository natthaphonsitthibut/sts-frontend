import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HeartHandshake } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  PageShell,
  SkeletonTable,
} from "../../../components/layout/page-primitives";
import { Pagination } from "../../../components/layout/pagination";
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from "../../../lib/pagination";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { SchoolClassRoomFilter } from "../../attendance/components/SchoolClassRoomFilter";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { CaseListFilter } from "../components/CaseListFilter";
import { CaseStatusUpdateDialog } from "../components/CaseStatusUpdateDialog";
import { CaseTable } from "../components/CaseTable";
import { useCases } from "../hooks/useCases";
import type { CaseListQuery, CaseRecord } from "../types/cases.types";

export function CasesListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const schoolArea = useSchoolAreaFilter();
  const scope = useScopeCascade({ lockToActorScope: true });

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);

  const query = useMemo<CaseListQuery>(
    () => ({
      status,
      schoolId: scope.schoolId || undefined,
      grade: scope.grade || undefined,
      room: scope.room || undefined,
      searchTerm: debouncedSearch || undefined,
      page,
      limit: rowsPerPage,
    }),
    [status, scope.schoolId, scope.grade, scope.room, debouncedSearch, page, rowsPerPage],
  );

  const { cases, meta, isLoading, isError, refetch } = useCases(query);
  const totalCount = meta?.totalCount ?? 0;

  function handleSearchChange(value: string): void {
    setSearchQuery(value);
    setPage(1);
  }

  function handleStatusChange(value: string): void {
    setStatus(value);
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

  function openUpdate(caseRecord: CaseRecord): void {
    setSelectedCase(caseRecord);
    setDialogOpen(true);
  }

  function openCreateLink(caseRecord: CaseRecord): void {
    void navigate("/create/visit", {
      state: {
        prefill: {
          existing_case_id: String(caseRecord.id),
          student_id: caseRecord.student_id ?? null,
          student_name: caseRecord.student_name,
          student_school: caseRecord.student_school ?? null,
          student_address: caseRecord.student_address ?? null,
          reason_flagged: caseRecord.reason_flagged ?? caseRecord.reason ?? null,
        },
      },
    });
  }

  return (
    <PageShell>
      <CaseListFilter
        count={totalCount}
        onRefresh={refetch}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        searchQuery={searchQuery}
        schoolFilters={
          <SchoolClassRoomFilter
            area={schoolArea}
            onGradeChange={handleGradeChange}
            onRoomChange={handleRoomChange}
            onSchoolChange={handleSchoolChange}
            scope={scope}
          />
        }
        status={status}
      />

      {isError ? (
        <ErrorState
          title="ไม่สามารถโหลดข้อมูลเคสได้"
          description="เกิดข้อผิดพลาดระหว่างโหลดรายการเคส"
          onRetry={refetch}
        />
      ) : isLoading ? (
        <SkeletonTable />
      ) : cases.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title="ไม่พบเคสช่วยเหลือ"
          description="ลองปรับตัวกรองสถานะ หรือค้นหาด้วยชื่อนักเรียนอีกครั้ง"
        />
      ) : (
        <>
          <CaseTable onCreateLink={openCreateLink} onUpdate={openUpdate} rows={cases} />
          <Pagination
            onPageChange={setPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            totalCount={totalCount}
            unitLabel="เคส"
          />
        </>
      )}

      <CaseStatusUpdateDialog
        key={selectedCase?.id ?? "none"}
        caseRecord={selectedCase}
        onOpenChange={setDialogOpen}
        onUpdated={() => void refetch()}
        open={dialogOpen}
      />
    </PageShell>
  );
}
