import { useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, UserCheck, X } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  Select,
  useConfirm,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { Pagination } from "../../../components/layout/pagination";
import { getApiErrorMessage } from "../../../lib/api-error";
import {
  useImportQuarantine,
  useImportQuarantineCandidates,
  useResolveImportQuarantine,
} from "../hooks/useSubmitImport";
import {
  type ImportQuarantineItem,
  type QuarantinePageSize,
  type QuarantineStatus,
  REASON_LABELS,
} from "../types/import.types";

const QUARANTINE_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const STATUS_LABELS: Record<QuarantineStatus, string> = {
  PENDING: "รอตรวจสอบ",
  RESOLVED: "แก้ไขแล้ว",
  REJECTED: "ปฏิเสธแล้ว",
};

const RETRYABLE_REASON_CODES = new Set([
  "UNMAPPED_STUDENT_STATUS",
  "SCHOOL_NOT_FOUND",
  "GRADE_NOT_FOUND",
  "ROOM_NOT_FOUND",
  "STATUS_CAUSE_UNMAPPED",
]);

function quarantineStatusVariant(
  status: QuarantineStatus,
): "warning" | "success" | "secondary" {
  if (status === "PENDING") return "warning";
  if (status === "RESOLVED") return "success";
  return "secondary";
}

function compareText(
  left: string | null | undefined,
  right: string | null | undefined,
): number {
  return (left ?? "").localeCompare(right ?? "", "th");
}

function compareNumber(left: number, right: number): number {
  return left - right;
}

function sortQuarantineItems(
  items: ImportQuarantineItem[],
  sort: DataTableSortState | undefined,
): ImportQuarantineItem[] {
  if (!sort) return items;
  const direction = sort.direction === "asc" ? 1 : -1;
  return [...items].sort((left, right) => {
    let result = 0;
    if (sort.key === "student") {
      result =
        compareText(left.student.firstName, right.student.firstName) ||
        compareText(left.student.lastName, right.student.lastName);
    } else if (sort.key === "school") {
      result =
        compareText(
          left.schoolName ?? String(left.schoolId ?? ""),
          right.schoolName ?? String(right.schoolId ?? ""),
        ) || compareNumber(left.sourceRowNumber, right.sourceRowNumber);
    } else if (sort.key === "reason") {
      result = compareText(
        REASON_LABELS[left.reasonCode] ?? left.reasonCode,
        REASON_LABELS[right.reasonCode] ?? right.reasonCode,
      );
    } else if (sort.key === "term") {
      result =
        compareText(left.student.academicYear, right.student.academicYear) ||
        compareText(left.student.semester, right.student.semester);
    } else if (sort.key === "status") {
      result = compareText(
        STATUS_LABELS[left.status],
        STATUS_LABELS[right.status],
      );
    }
    return result * direction;
  });
}

interface ImportQuarantineActionsProps {
  item: ImportQuarantineItem;
  isPending: boolean;
  onReject: (id: string) => void;
  onRetry: (id: string) => void;
  onSelectCandidate: (id: string) => void;
}

function ImportQuarantineActions({
  isPending,
  item,
  onReject,
  onRetry,
  onSelectCandidate,
}: ImportQuarantineActionsProps) {
  if (item.status !== "PENDING") {
    return <span className="text-sm text-slate-400">-</span>;
  }

  return (
    <div className="flex flex-nowrap justify-end gap-2">
      {item.reasonCode === "IDENTIFIER_CONFLICT" ? (
        <Button
          className="whitespace-nowrap"
          disabled={isPending}
          icon={UserCheck}
          onClick={() => onSelectCandidate(item.id)}
          variant="outline"
        >
          เลือกโปรไฟล์
        </Button>
      ) : null}
      {RETRYABLE_REASON_CODES.has(item.reasonCode) ? (
        <Button
          className="whitespace-nowrap"
          disabled={isPending}
          icon={RefreshCw}
          onClick={() => onRetry(item.id)}
          variant="outline"
        >
          ตรวจซ้ำ/นำเข้า
        </Button>
      ) : null}
      <Button
        className="whitespace-nowrap"
        disabled={isPending}
        icon={X}
        onClick={() => onReject(item.id)}
        variant="destructive"
      >
        ปฏิเสธ
      </Button>
    </div>
  );
}

interface ImportQuarantineTableProps {
  items: ImportQuarantineItem[];
  isResolving: boolean;
  onReject: (id: string) => void;
  onRetry: (id: string) => void;
  onSelectCandidate: (id: string) => void;
  onSortChange: (sort: DataTableSortState | undefined) => void;
  sort: DataTableSortState | undefined;
}

function ImportQuarantineTable({
  isResolving,
  items,
  onReject,
  onRetry,
  onSelectCandidate,
  onSortChange,
  sort,
}: ImportQuarantineTableProps) {
  return (
    <>
      <DataTable
        columnWidths={[
          "w-[16%]",
          "w-[17%]",
          "w-[22%]",
          "w-[10%]",
          "w-[11%]",
          "w-[24%]",
        ]}
        headings={[
          {
            label: "นักเรียน",
            sortKey: "student",
            ariaLabel: "เรียงตามชื่อนักเรียน",
          },
          {
            label: "โรงเรียน/แถว",
            sortKey: "school",
            ariaLabel: "เรียงตามโรงเรียน",
          },
          { label: "สาเหตุ", sortKey: "reason", ariaLabel: "เรียงตามสาเหตุ" },
          { label: "ปี/เทอม", sortKey: "term", ariaLabel: "เรียงตามปีและเทอม" },
          { label: "สถานะ", sortKey: "status", ariaLabel: "เรียงตามสถานะ" },
          { label: "จัดการ", className: "text-right" },
        ]}
        minWidthClassName="min-w-[980px]"
        onSortChange={onSortChange}
        sort={sort}
      >
        {items.map((item) => (
          <DataTableRow key={item.id}>
            <DataTableCell>
              <div className="font-bold text-slate-900">
                {item.student.firstName} {item.student.lastName}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {item.student.personIdMasked}
              </div>
            </DataTableCell>
            <DataTableCell>
              <div className="font-medium text-slate-700">
                {item.schoolName ?? `โรงเรียน ${item.schoolId ?? "-"}`}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                แถว {item.sourceRowNumber}
              </div>
            </DataTableCell>
            <DataTableCell>
              {REASON_LABELS[item.reasonCode] ?? item.reasonCode}
            </DataTableCell>
            <DataTableCell>
              ปี {item.student.academicYear}
              <br />
              เทอม {item.student.semester}
            </DataTableCell>
            <DataTableCell>
              <Badge
                className="whitespace-nowrap"
                variant={quarantineStatusVariant(item.status)}
              >
                {STATUS_LABELS[item.status]}
              </Badge>
            </DataTableCell>
            <DataTableCell className="text-right">
              <ImportQuarantineActions
                isPending={isResolving}
                item={item}
                onReject={onReject}
                onRetry={onRetry}
                onSelectCandidate={onSelectCandidate}
              />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>

      <TableCardList>
        {items.map((item) => (
          <TableCard className="space-y-3" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-slate-900">
                  {item.student.firstName} {item.student.lastName}
                </div>
                <div className="text-sm text-slate-500">
                  {item.student.personIdMasked} ·{" "}
                  {item.schoolName ?? `โรงเรียน ${item.schoolId ?? "-"}`} · แถว{" "}
                  {item.sourceRowNumber}
                </div>
              </div>
              <Badge variant={quarantineStatusVariant(item.status)}>
                {STATUS_LABELS[item.status]}
              </Badge>
            </div>
            <div className="text-sm text-slate-700">
              สาเหตุ: {REASON_LABELS[item.reasonCode] ?? item.reasonCode}
            </div>
            <div className="text-sm text-slate-500">
              ปี {item.student.academicYear} / เทอม {item.student.semester}
            </div>
            <ImportQuarantineActions
              isPending={isResolving}
              item={item}
              onReject={onReject}
              onRetry={onRetry}
              onSelectCandidate={onSelectCandidate}
            />
          </TableCard>
        ))}
      </TableCardList>
    </>
  );
}

interface CandidateResolverProps {
  item: ImportQuarantineItem;
  candidates: ReturnType<typeof useImportQuarantineCandidates>;
  isResolving: boolean;
  selectedCandidateKey: string;
  onCancel: () => void;
  onConfirm: () => void;
  onSelectedCandidateChange: (value: string) => void;
}

function CandidateResolver({
  candidates,
  isResolving,
  item,
  onCancel,
  onConfirm,
  onSelectedCandidateChange,
  selectedCandidateKey,
}: CandidateResolverProps) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div>
          <div className="text-sm font-bold text-slate-900">
            เลือกโปรไฟล์สำหรับแถว import นี้
          </div>
          <div className="text-sm text-slate-500">
            {item.student.firstName} {item.student.lastName} ·{" "}
            {item.student.personIdMasked} · แถว {item.sourceRowNumber}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            การเลือกนี้ใช้กับแถว import นี้เท่านั้น
            ไม่ได้รวมโปรไฟล์หรือลบเลขซ้ำในระบบ
          </div>
        </div>
        {candidates.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {getApiErrorMessage(
                candidates.error,
                "โหลดโปรไฟล์ที่ตรงกันไม่สำเร็จ",
              )}
            </AlertDescription>
          </Alert>
        ) : null}
        <Select
          aria-label="เลือกโปรไฟล์ที่ตรงกับรายการ"
          disabled={candidates.isLoading || isResolving}
          onChange={(event) => onSelectedCandidateChange(event.target.value)}
          value={selectedCandidateKey}
        >
          <option value="">เลือกโปรไฟล์</option>
          {(candidates.data ?? []).map((candidate) => (
            <option key={candidate.candidateKey} value={candidate.candidateKey}>
              {candidate.firstName} {candidate.lastName} ·{" "}
              {candidate.personIdMasked}
            </option>
          ))}
        </Select>
        {!candidates.isLoading &&
        !candidates.isError &&
        candidates.data?.length === 0 ? (
          <div className="text-sm text-slate-500">
            ไม่พบโปรไฟล์ที่สามารถเลือกได้
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!selectedCandidateKey}
            icon={CheckCircle2}
            isLoading={isResolving}
            onClick={onConfirm}
          >
            ยืนยันใช้โปรไฟล์นี้
          </Button>
          <Button disabled={isResolving} onClick={onCancel} variant="outline">
            ยกเลิก
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export interface ImportQuarantinePanelProps {
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: QuarantinePageSize) => void;
  page: number;
  query: ReturnType<typeof useImportQuarantine>;
  rowsPerPage: QuarantinePageSize;
}

export function ImportQuarantinePanel({
  onPageChange,
  onRowsPerPageChange,
  page,
  query,
  rowsPerPage,
}: ImportQuarantinePanelProps) {
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedCandidateKey, setSelectedCandidateKey] = useState("");
  const candidates = useImportQuarantineCandidates(selectedId);
  const resolveMutation = useResolveImportQuarantine();
  const { confirm, dialog } = useConfirm();
  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const sortedItems = useMemo(
    () => sortQuarantineItems(items, sort),
    [items, sort],
  );
  const selectedItem = items.find((item) => item.id === selectedId);

  function resetSelection(): void {
    setSelectedId(undefined);
    setSelectedCandidateKey("");
  }

  async function reject(id: string): Promise<void> {
    const accepted = await confirm({
      title: "ยืนยันการปฏิเสธรายการ",
      description: "รายการจะถูกเก็บในประวัติและจะไม่สร้างข้อมูลนักเรียน",
      confirmText: "ปฏิเสธรายการ",
      variant: "destructive",
    });
    if (accepted) {
      resolveMutation.mutate(
        { id, action: "REJECT" },
        {
          onSuccess: () => {
            if (selectedId === id) {
              setSelectedId(undefined);
              setSelectedCandidateKey("");
            }
          },
        },
      );
    }
  }

  async function retryImport(id: string): Promise<void> {
    const accepted = await confirm({
      title: "ตรวจซ้ำและนำเข้ารายการ",
      description:
        "ระบบจะตรวจข้อมูลหลักอีกครั้ง แล้วนำเข้ารายการนี้ถ้าปัญหาถูกแก้แล้ว",
      confirmText: "ตรวจซ้ำ/นำเข้า",
    });
    if (accepted) {
      resolveMutation.mutate(
        { id, action: "RESOLVE" },
        {
          onSuccess: () => {
            if (selectedId === id) {
              setSelectedId(undefined);
              setSelectedCandidateKey("");
            }
          },
        },
      );
    }
  }

  function resolve(): void {
    if (!selectedId || !selectedCandidateKey) return;
    resolveMutation.mutate(
      { id: selectedId, action: "RESOLVE", candidateKey: selectedCandidateKey },
      {
        onSuccess: () => {
          setSelectedId(undefined);
          setSelectedCandidateKey("");
        },
      },
    );
  }

  return (
    <section className="space-y-4">
      {query.isLoading ? (
        <div className="py-10 text-center text-slate-500">กำลังโหลด...</div>
      ) : null}
      {query.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(query.error, "โหลดรายการไม่สำเร็จ")}
          </AlertDescription>
        </Alert>
      ) : null}
      {resolveMutation.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(
              resolveMutation.error,
              "ดำเนินการรายการไม่สำเร็จ",
            )}
          </AlertDescription>
        </Alert>
      ) : null}
      {query.data?.items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-500">
            ไม่พบรายการ
          </CardContent>
        </Card>
      ) : null}
      {items.length > 0 ? (
        <ImportQuarantineTable
          isResolving={resolveMutation.isPending}
          items={sortedItems}
          onReject={(id) => void reject(id)}
          onRetry={(id) => void retryImport(id)}
          onSelectCandidate={(id) => {
            setSelectedId(id);
            setSelectedCandidateKey("");
          }}
          onSortChange={setSort}
          sort={sort}
        />
      ) : null}

      {selectedItem ? (
        <CandidateResolver
          candidates={candidates}
          isResolving={resolveMutation.isPending}
          item={selectedItem}
          onCancel={resetSelection}
          onConfirm={resolve}
          onSelectedCandidateChange={setSelectedCandidateKey}
          selectedCandidateKey={selectedCandidateKey}
        />
      ) : null}

      {query.data ? (
        <Pagination
          onPageChange={(nextPage) => {
            resetSelection();
            onPageChange(nextPage);
          }}
          onRowsPerPageChange={(nextRowsPerPage) => {
            resetSelection();
            onRowsPerPageChange(nextRowsPerPage as QuarantinePageSize);
          }}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={QUARANTINE_PAGE_SIZE_OPTIONS}
          totalCount={query.data.meta.totalCount}
        />
      ) : null}
      {dialog}
    </section>
  );
}
