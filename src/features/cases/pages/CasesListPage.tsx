import { useMemo, useState } from "react";
import { HeartHandshake } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  PageShell,
  SkeletonTable,
} from "../../../components/layout/page-primitives";
import { CaseListFilter } from "../components/CaseListFilter";
import { CaseStatusUpdateDialog } from "../components/CaseStatusUpdateDialog";
import { CaseTable } from "../components/CaseTable";
import { useCases } from "../hooks/useCases";
import type { CaseRecord } from "../types/cases.types";

export function CasesListPage() {
  const { cases, isLoading, isError, refetch } = useCases();

  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredCases = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return cases.filter((caseRecord) => {
      if (status !== "ALL" && caseRecord.status !== status) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      return caseRecord.student_name.toLowerCase().includes(normalizedSearch);
    });
  }, [cases, status, searchQuery]);

  function openUpdate(caseRecord: CaseRecord): void {
    setSelectedCase(caseRecord);
    setDialogOpen(true);
  }

  return (
    <PageShell>
      <CaseListFilter
        count={filteredCases.length}
        onRefresh={refetch}
        onSearchChange={setSearchQuery}
        onStatusChange={setStatus}
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
      ) : filteredCases.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title="ไม่พบเคสช่วยเหลือ"
          description="ลองปรับตัวกรองสถานะ หรือค้นหาด้วยชื่อนักเรียนอีกครั้ง"
        />
      ) : (
        <CaseTable onUpdate={openUpdate} rows={filteredCases} />
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
