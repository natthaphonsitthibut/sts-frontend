import { useMemo, useState } from "react";
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
import { CaseListFilter } from "../components/CaseListFilter";
import { CaseStatusUpdateDialog } from "../components/CaseStatusUpdateDialog";
import { CaseTable } from "../components/CaseTable";
import { useCases } from "../hooks/useCases";
import type { CaseListQuery, CaseRecord } from "../types/cases.types";

export function CasesListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 350);

  const query = useMemo<CaseListQuery>(
    () => ({
      status,
      searchTerm: debouncedSearch || undefined,
      page,
      limit: rowsPerPage,
    }),
    [status, debouncedSearch, page, rowsPerPage],
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

  function handleRowsPerPageChange(value: number): void {
    setRowsPerPage(value);
    setPage(1);
  }

  function openUpdate(caseRecord: CaseRecord): void {
    setSelectedCase(caseRecord);
    setDialogOpen(true);
  }

  return (
    <PageShell>
      <CaseListFilter
        count={totalCount}
        onRefresh={refetch}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        searchQuery={searchQuery}
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
          <CaseTable onUpdate={openUpdate} rows={cases} />
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
        open={dialogOpen}
      />
    </PageShell>
  );
}
