import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Eye, RefreshCw, SquarePen, UserCheck, X } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
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
import { cn } from "../../../lib/utils";
import {
  useImportQuarantine,
  useImportQuarantineCandidates,
  useFixImportQuarantineValues,
  useRetryableImportQuarantineSummary,
  useRetryReadyImportQuarantine,
  useResolveImportQuarantine,
} from "../hooks/useSubmitImport";
import {
  type ImportQuarantineFilterParams,
  type ImportQuarantineItem,
  type ImportQuarantinePersonContext,
  type QuarantinePageSize,
} from "../types/import.types";
import {
  ImportQuarantineFixDialog,
  ImportQuarantineRejectDialog,
} from "./ImportQuarantineDialogs";

const QUARANTINE_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

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
      result = compareText(left.reasonLabel, right.reasonLabel);
    } else if (sort.key === "term") {
      result =
        compareText(left.student.academicYear, right.student.academicYear) ||
        compareText(left.student.semester, right.student.semester);
    } else if (sort.key === "status") {
      result = compareText(left.statusLabel, right.statusLabel);
    }
    return result * direction;
  });
}

interface ImportQuarantineActionsProps {
  item: ImportQuarantineItem;
  isPending: boolean;
  onReject: (id: string) => void;
  onEdit: (id: string) => void;
  onRetry: (id: string) => void;
  onSelectCandidate: (id: string) => void;
  onViewDetail: (id: string) => void;
}

/** Same width for every primary action so rows line up across states. */
const PRIMARY_ACTION_CLASS = "w-36 shrink-0 justify-center whitespace-nowrap";

function ImportQuarantineActions({
  isPending,
  item,
  onReject,
  onEdit,
  onRetry,
  onSelectCandidate,
  onViewDetail,
}: ImportQuarantineActionsProps) {
  if (item.status !== "PENDING") {
    return (
      <div className="flex flex-nowrap justify-end">
        <Button
          className={PRIMARY_ACTION_CLASS}
          icon={Eye}
          onClick={() => onViewDetail(item.id)}
          variant="outline"
        >
          ดูรายละเอียด
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-nowrap justify-end gap-2">
      {item.resolution.action === "EDIT_FIELDS" ? (
        <Button
          className={PRIMARY_ACTION_CLASS}
          disabled={isPending}
          icon={SquarePen}
          onClick={() => onEdit(item.id)}
          variant="outline"
        >
          แก้ไขข้อมูล
        </Button>
      ) : null}
      {item.resolution.action === "SELECT_CANDIDATE" ? (
        <Button
          className={PRIMARY_ACTION_CLASS}
          disabled={isPending}
          icon={UserCheck}
          onClick={() => onSelectCandidate(item.id)}
          variant="outline"
        >
          เลือกโปรไฟล์
        </Button>
      ) : null}
      {item.resolution.action === "RETRY" ? (
        <Button
          className={PRIMARY_ACTION_CLASS}
          disabled={isPending}
          icon={RefreshCw}
          onClick={() => onRetry(item.id)}
          variant="outline"
        >
          ลองนำเข้า
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
  onEdit: (id: string) => void;
  onRetry: (id: string) => void;
  onSelectCandidate: (id: string) => void;
  onViewDetail: (id: string) => void;
  onSortChange: (sort: DataTableSortState | undefined) => void;
  sort: DataTableSortState | undefined;
}

function ImportQuarantineTable({
  isResolving,
  items,
  onReject,
  onEdit,
  onRetry,
  onSelectCandidate,
  onViewDetail,
  onSortChange,
  sort,
}: ImportQuarantineTableProps) {
  return (
    <>
      <DataTable
        columnWidths={[
          "w-[15%]",
          "w-[16%]",
          "w-[19%]",
          "w-[9%]",
          "w-[14%]",
          "w-[27%]",
        ]}
        headings={[
          {
            label: "นักเรียน",
            sortKey: "student",
            ariaLabel: "เรียงตามชื่อนักเรียน",
          },
          {
            label: "โรงเรียน",
            sortKey: "school",
            ariaLabel: "เรียงตามโรงเรียน",
          },
          { label: "สาเหตุ", sortKey: "reason", ariaLabel: "เรียงตามสาเหตุ" },
          { label: "ปี/เทอม", sortKey: "term", ariaLabel: "เรียงตามปีและเทอม" },
          { label: "สถานะ", sortKey: "status", ariaLabel: "เรียงตามสถานะ" },
          { label: "จัดการ", className: "text-right" },
        ]}
        minWidthClassName="min-w-full"
        onSortChange={onSortChange}
        responsiveBreakpoint="lg"
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
            </DataTableCell>
            <DataTableCell>
              {item.reasonLabel}
            </DataTableCell>
            <DataTableCell>
              ปี {item.student.academicYear}
              <br />
              เทอม {item.student.semester}
            </DataTableCell>
            <DataTableCell>
              {item.status === "PENDING" ? (
                <Badge className="whitespace-nowrap text-[11px]" variant={item.resolution.variant}>
                  {item.resolution.label}
                </Badge>
              ) : (
                <Badge className="whitespace-nowrap text-[11px]" variant={item.statusBadgeVariant}>
                  {item.statusLabel}
                </Badge>
              )}
            </DataTableCell>
            <DataTableCell className="text-right">
              <ImportQuarantineActions
                isPending={isResolving}
                item={item}
                onEdit={onEdit}
                onReject={onReject}
                onRetry={onRetry}
                onSelectCandidate={onSelectCandidate}
                onViewDetail={onViewDetail}
              />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>

      <TableCardList desktopBreakpoint="lg">
        {items.map((item) => (
          <TableCard className="space-y-3" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-slate-900">
                  {item.student.firstName} {item.student.lastName}
                </div>
                <div className="text-sm text-slate-500">
                  {item.student.personIdMasked} ·{" "}
                  {item.schoolName ?? `โรงเรียน ${item.schoolId ?? "-"}`}
                </div>
              </div>
              <Badge
                className="shrink-0 whitespace-nowrap text-[11px]"
                variant={
                  item.status === "PENDING"
                    ? item.resolution.variant
                    : item.statusBadgeVariant
                }
              >
                {item.status === "PENDING"
                  ? item.resolution.label
                  : item.statusLabel}
              </Badge>
            </div>
            <div className="text-sm text-slate-700">
              สาเหตุ: {item.reasonLabel}
            </div>
            <div className="text-sm text-slate-500">
              ปี {item.student.academicYear} / เทอม {item.student.semester}
            </div>

            <ImportQuarantineActions
              isPending={isResolving}
              item={item}
              onEdit={onEdit}
              onReject={onReject}
              onRetry={onRetry}
              onSelectCandidate={onSelectCandidate}
              onViewDetail={onViewDetail}
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

function contextValue(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function gradeValue(context: ImportQuarantinePersonContext): string {
  return context.gradeLevelLabel ?? contextValue(context.gradeLevelId);
}

function statusValue(context: ImportQuarantinePersonContext): string {
  return context.studentStatusLabel ?? contextValue(context.studentStatusCode);
}

function comparisonValue(value: string): string {
  return value.trim().toLocaleLowerCase("th");
}

function ContextField({
  different = false,
  label,
  value,
}: {
  different?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-slate-100 bg-slate-50 px-3 py-2",
        different && "border-amber-200 bg-amber-50",
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
        <span>{label}</span>
        {different ? <span className="text-amber-700">แตกต่าง</span> : null}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function PersonContextFields({
  candidate,
  source,
}: {
  candidate: ImportQuarantinePersonContext;
  source?: ImportQuarantinePersonContext;
}) {
  const fields = [
    {
      label: "ชื่อ-นามสกุล",
      value: `${candidate.firstName} ${candidate.lastName}`,
      sourceValue: source ? `${source.firstName} ${source.lastName}` : undefined,
    },
    {
      label: "โรงเรียน",
      value: contextValue(candidate.schoolName),
      sourceValue: source ? contextValue(source.schoolName) : undefined,
    },
    {
      label: "จังหวัด",
      value: contextValue(candidate.province),
      sourceValue: source ? contextValue(source.province) : undefined,
    },
    {
      label: "ชั้น / ห้อง",
      value: `${gradeValue(candidate)} / ${contextValue(candidate.roomId)}`,
      sourceValue: source
        ? `${gradeValue(source)} / ${contextValue(source.roomId)}`
        : undefined,
    },
    {
      label: "ปี / เทอม",
      value: `${contextValue(candidate.academicYear)} / ${contextValue(candidate.semester)}`,
      sourceValue: source
        ? `${contextValue(source.academicYear)} / ${contextValue(source.semester)}`
        : undefined,
    },
    {
      label: "สถานะนักเรียน",
      value: statusValue(candidate),
      sourceValue: source ? statusValue(source) : undefined,
    },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {fields.map((field) => (
        <ContextField
          different={
            field.sourceValue !== undefined &&
            comparisonValue(field.value) !== comparisonValue(field.sourceValue)
          }
          key={field.label}
          label={field.label}
          value={field.value}
        />
      ))}
    </div>
  );
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
  const response = candidates.data;
  const importRow = response?.importRow;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <div className="text-sm font-bold text-slate-900">
            เลือกโปรไฟล์สำหรับแถว import นี้
          </div>
          <div className="text-sm text-slate-500">
            {item.student.firstName} {item.student.lastName} ·{" "}
            {item.student.personIdMasked}
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
        {response && response.meta.totalCount > response.meta.visibleCount ? (
          <Alert variant="warning">
            <AlertDescription>
              พบ {response.meta.totalCount} โปรไฟล์ แสดงได้ {response.meta.visibleCount}{" "}
              ตามขอบเขตข้อมูลของคุณ โปรไฟล์ที่อยู่นอกขอบเขตจะไม่สามารถเลือกได้
            </AlertDescription>
          </Alert>
        ) : null}
        {candidates.isLoading ? (
          <div className="py-6 text-center text-sm text-slate-500">
            กำลังโหลดข้อมูลเปรียบเทียบ...
          </div>
        ) : null}
        {response && importRow ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="mb-3">
                <div className="font-bold text-slate-900">ข้อมูลจากแถว import</div>
                <div className="text-xs text-slate-500">{importRow.personIdMasked}</div>
              </div>
              <PersonContextFields candidate={importRow} />
            </div>
            <fieldset className="space-y-3" disabled={isResolving}>
              <legend className="mb-2 font-bold text-slate-900">โปรไฟล์ที่เลือกได้</legend>
              {response.items.map((candidate) => {
                const checked = selectedCandidateKey === candidate.candidateKey;
                return (
                  <label
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors",
                      checked
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-slate-200 bg-white hover:border-primary/40",
                    )}
                    key={candidate.candidateKey}
                  >
                    <input
                      checked={checked}
                      className="mt-1 size-4 shrink-0 accent-primary"
                      name="quarantine-candidate"
                      onChange={() => onSelectedCandidateChange(candidate.candidateKey)}
                      type="radio"
                      value={candidate.candidateKey}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 text-xs text-slate-500">
                        {candidate.personIdMasked}
                      </div>
                      <PersonContextFields candidate={candidate} source={importRow} />
                    </div>
                  </label>
                );
              })}
            </fieldset>
          </div>
        ) : null}
        {!candidates.isLoading &&
        !candidates.isError &&
        response?.items.length === 0 ? (
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
  filters: ImportQuarantineFilterParams;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: QuarantinePageSize) => void;
  page: number;
  query: ReturnType<typeof useImportQuarantine>;
  retryEligibleLabel: string;
  rowsPerPage: QuarantinePageSize;
  showRetryBanner: boolean;
}

export function ImportQuarantinePanel({
  filters,
  onPageChange,
  onRowsPerPageChange,
  page,
  query,
  retryEligibleLabel,
  rowsPerPage,
  showRetryBanner,
}: ImportQuarantinePanelProps) {
  const navigate = useNavigate();
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedCandidateKey, setSelectedCandidateKey] = useState("");
  const [rejectId, setRejectId] = useState<string>();
  const [fixId, setFixId] = useState<string>();
  const candidates = useImportQuarantineCandidates(selectedId);
  const retrySummary = useRetryableImportQuarantineSummary(filters, showRetryBanner);
  const retryReadyMutation = useRetryReadyImportQuarantine();
  const resolveMutation = useResolveImportQuarantine();
  const fixMutation = useFixImportQuarantineValues();
  const { confirm, dialog } = useConfirm();
  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const sortedItems = useMemo(
    () => sortQuarantineItems(items, sort),
    [items, sort],
  );
  const selectedItem = items.find((item) => item.id === selectedId);
  const rejectItem = items.find((item) => item.id === rejectId);
  const fixItem = items.find((item) => item.id === fixId);

  function resetSelection(): void {
    setSelectedId(undefined);
    setSelectedCandidateKey("");
  }

  function reject(note: string): void {
    if (!rejectId) return;
    resolveMutation.mutate(
      { id: rejectId, action: "REJECT", note },
      {
        onSuccess: () => {
          if (selectedId === rejectId) resetSelection();
          setRejectId(undefined);
        },
      },
    );
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

  async function retryReadyRows(): Promise<void> {
    const readyCount = retrySummary.data?.readyCount ?? 0;
    if (readyCount === 0) return;
    const batchLimit = retrySummary.data?.batchLimit ?? readyCount;
    const accepted = await confirm({
      title: "ตรวจซ้ำรายการที่พร้อมแล้ว",
      description: `ระบบจะตรวจซ้ำสูงสุด ${Math.min(readyCount, batchLimit)} รายการในขอบเขตและตัวกรองปัจจุบัน แล้วนำเข้ารายการที่ผ่าน`,
      confirmText: "ตรวจซ้ำทั้งหมด",
    });
    if (accepted) {
      retryReadyMutation.mutate(filters, { onSuccess: resetSelection });
    }
  }

  return (
    <section className="space-y-4">
      {showRetryBanner && (retrySummary.data?.readyCount ?? 0) > 0 ? (
        <Alert variant="warning">
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {retryEligibleLabel} {retrySummary.data?.readyCount.toLocaleString("en-US")} จาก{" "}
              {query.data?.meta.totalCount.toLocaleString("en-US") ?? "-"} รายการ
            </span>
            <Button
              className="shrink-0"
              icon={RefreshCw}
              isLoading={retryReadyMutation.isPending}
              loadingText="กำลังตรวจซ้ำ"
              onClick={() => void retryReadyRows()}
              size="sm"
              variant="outline"
            >
              ลองนำเข้ารายการที่ผ่านการตรวจ
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {showRetryBanner && retrySummary.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(retrySummary.error, "ตรวจสอบรายการที่พร้อมนำเข้าไม่สำเร็จ")}
          </AlertDescription>
        </Alert>
      ) : null}
      {retryReadyMutation.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(retryReadyMutation.error, "ตรวจซ้ำรายการแบบชุดไม่สำเร็จ")}
          </AlertDescription>
        </Alert>
      ) : null}
      {retryReadyMutation.isSuccess &&
      retryReadyMutation.data.items.some((result) => result.outcome !== "IMPORTED") ? (
        <Alert variant="warning">
          <AlertDescription>
            <div className="font-semibold">
              นำเข้าสำเร็จ {retryReadyMutation.data.processedCount} รายการ
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {retryReadyMutation.data.items
                .filter((result) => result.outcome !== "IMPORTED")
                .map((result) => {
                  return (
                    <li key={result.id}>
                      {result.studentName}: {result.message}
                    </li>
                  );
                })}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
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
          onEdit={setFixId}
          onReject={setRejectId}
          onRetry={(id) => void retryImport(id)}
          onSelectCandidate={(id) => {
            setSelectedId(id);
            setSelectedCandidateKey("");
          }}
          onSortChange={setSort}
          onViewDetail={(id) => void navigate(`/import-data/quarantine/${id}`)}
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

      <ImportQuarantineRejectDialog
        isPending={resolveMutation.isPending}
        item={rejectItem}
        onClose={() => setRejectId(undefined)}
        onSubmit={reject}
      />
      <ImportQuarantineFixDialog
        error={
          fixMutation.isError
            ? getApiErrorMessage(fixMutation.error, "แก้ไขและนำเข้ารายการไม่สำเร็จ")
            : undefined
        }
        isPending={fixMutation.isPending}
        item={fixItem}
        onClose={() => {
          fixMutation.reset();
          setFixId(undefined);
        }}
        onSubmit={(values) => {
          if (!fixId) return;
          fixMutation.mutate(
            { id: fixId, values },
            {
              onSuccess: () => {
                setFixId(undefined);
              },
            },
          );
        }}
      />

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
