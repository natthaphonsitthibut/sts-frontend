import { Eye, Search } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
  TableCard,
  TableCardList,
} from "../../../components/layout/data-table";
import { EmptyState, ErrorState } from "../../../components/layout/page-primitives";
import { Pagination } from "../../../components/layout/pagination";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { formatThaiDateTime } from "../../../lib/date-time";
import { cn } from "../../../lib/utils";
import { useAuditLog } from "../hooks/useAuditLog";
import type { AuditLogDetail, AuditLogDomain, AuditLogEntry } from "../types/audit-log.types";

interface AuditLogActionOption {
  value: string;
  label: string;
}

interface AuditLogPanelProps {
  domain: AuditLogDomain;
  title: string;
  description?: string;
  province?: string;
  district?: string;
  subDistrict?: string;
  schoolId?: number;
  actionOptions?: readonly AuditLogActionOption[];
  showActionColumn?: boolean;
  showReferenceColumn?: boolean;
  className?: string;
}

const DATE_INPUT_CLASS_NAME = "text-slate-900 [color-scheme:light] [-webkit-text-fill-color:#0f172a] [&::-webkit-datetime-edit]:text-slate-900 [&::-webkit-datetime-edit-day-field]:text-slate-900 [&::-webkit-datetime-edit-month-field]:text-slate-900 [&::-webkit-datetime-edit-year-field]:text-slate-900";

const TARGET_TYPE_LABELS: Record<string, string> = {
  case: "เคสช่วยเหลือ",
  case_referral: "การส่งต่อเคส",
  import: "การนำเข้าข้อมูล",
  role_group: "กลุ่มสิทธิ์",
  student_accounts: "บัญชีนักเรียน",
  task: "ภารกิจ",
  task_link: "ลิงก์ภารกิจ",
  user: "ผู้ใช้งาน",
};

function getTargetLabel(entry: AuditLogEntry): string {
  const targetType = entry.targetType
    ? TARGET_TYPE_LABELS[entry.targetType] || entry.targetType
    : null;
  if (!entry.targetType && !entry.targetId) return "-";
  if (!entry.targetId) return targetType || "-";
  if (!entry.targetType) return entry.targetId;
  return `${targetType}: ${entry.targetId}`;
}

function formatDetails(details: AuditLogDetail[]): string {
  if (details.length === 0) return "-";
  return details.map((detail) => `${detail.label}: ${String(detail.value)}`).join(" · ");
}

function getAuditLogSortValue(entry: AuditLogEntry, key: string): string {
  if (key === "time") return entry.createdAt;
  if (key === "action") return entry.actionLabel;
  if (key === "actor") return entry.actorLabel;
  if (key === "reference") return getTargetLabel(entry);
  if (key === "details") return formatDetails(entry.details);
  return "";
}

function AuditLogDetailBlock({ entry }: { entry: AuditLogEntry }) {
  return (
    <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
      <dt className="font-semibold text-slate-500">เวลา</dt>
      <dd className="font-medium tabular-nums text-slate-800">
        {formatThaiDateTime(entry.createdAt)}
      </dd>
      <dt className="font-semibold text-slate-500">ผู้ทำรายการ</dt>
      <dd className="font-medium text-slate-800">{entry.actorLabel}</dd>
      {entry.targetId ? (
        <>
          <dt className="font-semibold text-slate-500">อ้างอิง</dt>
          <dd className="break-all font-medium text-slate-800">{getTargetLabel(entry)}</dd>
        </>
      ) : null}
      {entry.details.map((detail) => (
        <div className="contents" key={detail.label}>
          <dt className="font-semibold text-slate-500">{detail.label}</dt>
          <dd className="break-words font-medium text-slate-800">{String(detail.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function AuditLogFilters({
  action,
  actionOptions,
  dateFrom,
  dateTo,
  onActionChange,
  onDateFromChange,
  onDateToChange,
  onSearchTermChange,
  searchTerm,
}: {
  action: string;
  actionOptions: readonly AuditLogActionOption[];
  dateFrom: string;
  dateTo: string;
  onActionChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onSearchTermChange: (value: string) => void;
  searchTerm: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:items-end",
        actionOptions.length > 0
          ? "md:grid-cols-[minmax(220px,1fr)_170px_150px_150px]"
          : "md:grid-cols-[minmax(220px,1fr)_150px_150px]",
      )}
    >
      <div className="space-y-1.5">
        <Label htmlFor="audit-search">ค้นหา</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="audit-search"
            className="pl-9"
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="ผู้ทำรายการ หรือรหัสอ้างอิง"
            value={searchTerm}
          />
        </div>
      </div>
      {actionOptions.length > 0 ? (
        <div className="space-y-1.5">
          <Label htmlFor="audit-action">ประเภท</Label>
          <Select
            id="audit-action"
            onChange={(event) => onActionChange(event.target.value)}
            value={action}
          >
            <option value="">ทุกประเภท</option>
            {actionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="audit-date-from">จากวันที่</Label>
        <Input
          id="audit-date-from"
          className={DATE_INPUT_CLASS_NAME}
          onChange={(event) => onDateFromChange(event.target.value)}
          type="date"
          value={dateFrom}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="audit-date-to">ถึงวันที่</Label>
        <Input
          id="audit-date-to"
          className={DATE_INPUT_CLASS_NAME}
          onChange={(event) => onDateToChange(event.target.value)}
          type="date"
          value={dateTo}
        />
      </div>
    </div>
  );
}

function AuditLogTable({
  entries,
  showActionColumn,
  showReferenceColumn,
}: {
  entries: AuditLogEntry[];
  showActionColumn: boolean;
  showReferenceColumn: boolean;
}) {
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const sortedEntries = useMemo(() => {
    if (!sort) return entries;
    return [...entries].sort((left, right) => {
      const result = getAuditLogSortValue(left, sort.key).localeCompare(
        getAuditLogSortValue(right, sort.key),
        "th",
      );
      return sort.direction === "asc" ? result : -result;
    });
  }, [entries, sort]);
  const columnCount =
    4 + (showActionColumn ? 1 : 0) + (showReferenceColumn ? 1 : 0);

  function toggleDetails(entryId: string): void {
    setExpandedEntryId((current) => (current === entryId ? null : entryId));
  }

  return (
    <>
      <DataTable
        headings={[
          { label: "เวลา", sortKey: "time" },
          ...(showActionColumn ? [{ label: "ประเภท", sortKey: "action" }] : []),
          { label: "ผู้ทำรายการ", sortKey: "actor" },
          ...(showReferenceColumn
            ? [{ label: "อ้างอิง", sortKey: "reference" }]
            : []),
          { label: "รายละเอียด", sortKey: "details" },
          "จัดการ",
        ]}
        minWidthClassName={showActionColumn || showReferenceColumn ? "min-w-[1060px]" : "min-w-[820px]"}
        onSortChange={setSort}
        sort={sort}
      >
        {sortedEntries.map((entry) => {
          const expanded = expandedEntryId === entry.id;
          return (
            <Fragment key={entry.id}>
              <DataTableRow>
                <DataTableCell className="text-sm font-medium tabular-nums text-slate-600">
                  {formatThaiDateTime(entry.createdAt)}
                </DataTableCell>
                {showActionColumn ? (
                  <DataTableCell>
                    <Badge variant="secondary">{entry.actionLabel}</Badge>
                  </DataTableCell>
                ) : null}
                <DataTableCell className="font-semibold text-slate-800">
                  {entry.actorLabel}
                </DataTableCell>
                {showReferenceColumn ? (
                  <DataTableCell className="font-mono text-sm text-slate-600">
                    {getTargetLabel(entry)}
                  </DataTableCell>
                ) : null}
                <DataTableCell className="text-sm text-slate-600">
                  {formatDetails(entry.details)}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex justify-end">
                    <Button
                      aria-expanded={expanded}
                      icon={Eye}
                      onClick={() => toggleDetails(entry.id)}
                      size="sm"
                      variant="outline"
                    >
                      {expanded ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                    </Button>
                  </div>
                </DataTableCell>
              </DataTableRow>
              {expanded ? (
                <DataTableRow className="bg-slate-50 hover:bg-slate-50">
                  <DataTableCell className="h-auto py-4" colSpan={columnCount}>
                    <AuditLogDetailBlock entry={entry} />
                  </DataTableCell>
                </DataTableRow>
              ) : null}
            </Fragment>
          );
        })}
      </DataTable>
      <TableCardList>
        {sortedEntries.map((entry) => {
          const expanded = expandedEntryId === entry.id;
          return (
            <TableCard key={entry.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {showActionColumn ? <Badge variant="secondary">{entry.actionLabel}</Badge> : null}
                <time className="text-sm font-medium tabular-nums text-slate-600" dateTime={entry.createdAt}>
                  {formatThaiDateTime(entry.createdAt)}
                </time>
              </div>
              <div className="text-sm font-semibold text-slate-900">{entry.actorLabel}</div>
              {showReferenceColumn ? (
                <div className="font-mono text-sm text-slate-600">{getTargetLabel(entry)}</div>
              ) : null}
              <div className="text-sm text-slate-600">{formatDetails(entry.details)}</div>
              {expanded ? (
                <div className="rounded-md bg-slate-50 p-3">
                  <AuditLogDetailBlock entry={entry} />
                </div>
              ) : null}
              <div className="flex justify-end">
                <Button
                  aria-expanded={expanded}
                  icon={Eye}
                  onClick={() => toggleDetails(entry.id)}
                  size="sm"
                  variant="outline"
                >
                  {expanded ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                </Button>
              </div>
            </TableCard>
          );
        })}
      </TableCardList>
    </>
  );
}

export function AuditLogPanel({
  actionOptions = [],
  className,
  description,
  district,
  domain,
  province,
  schoolId,
  showActionColumn = true,
  showReferenceColumn = true,
  subDistrict,
  title,
}: AuditLogPanelProps) {
  const scopeKey = `${province || ""}|${district || ""}|${subDistrict || ""}|${schoolId || ""}`;
  const [pageState, setPageState] = useState({ page: 1, scopeKey });
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm.trim(), 350);
  const page = pageState.scopeKey === scopeKey ? pageState.page : 1;

  const query = useMemo(
    () => ({
      domain,
      province,
      district,
      subDistrict,
      schoolId,
      action: action || undefined,
      searchTerm: debouncedSearchTerm || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit: rowsPerPage,
    }),
    [
      action,
      dateFrom,
      dateTo,
      debouncedSearchTerm,
      district,
      domain,
      page,
      province,
      rowsPerPage,
      schoolId,
      subDistrict,
    ],
  );

  const auditLog = useAuditLog(query);
  const totalCount = auditLog.meta?.totalCount ?? auditLog.entries.length;

  function resetPageAnd(run: () => void): void {
    setPageState({ page: 1, scopeKey });
    run();
  }

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        <div className="text-right text-sm font-semibold text-slate-500">
          {auditLog.isFetching ? "กำลังอัปเดต" : `${totalCount.toLocaleString("en-US")} รายการ`}
        </div>
      </div>

      <AuditLogFilters
        action={action}
        actionOptions={actionOptions}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onActionChange={(value) => resetPageAnd(() => setAction(value))}
        onDateFromChange={(value) => resetPageAnd(() => setDateFrom(value))}
        onDateToChange={(value) => resetPageAnd(() => setDateTo(value))}
        onSearchTermChange={(value) => resetPageAnd(() => setSearchTerm(value))}
        searchTerm={searchTerm}
      />

      {auditLog.isError ? (
        <ErrorState title="โหลดประวัติไม่สำเร็จ" onRetry={auditLog.refetch} />
      ) : auditLog.isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">
          กำลังโหลดประวัติ
        </div>
      ) : auditLog.entries.length === 0 ? (
        <EmptyState icon={Search} title="ยังไม่มีประวัติในขอบเขตนี้" />
      ) : (
        <AuditLogTable
          entries={auditLog.entries}
          showActionColumn={showActionColumn}
          showReferenceColumn={showReferenceColumn}
        />
      )}

      {totalCount > 0 ? (
        <Pagination
          page={auditLog.meta?.page ?? page}
          rowsPerPage={auditLog.meta?.limit ?? rowsPerPage}
          rowsPerPageOptions={PAGE_SIZE_OPTIONS}
          totalCount={totalCount}
          unitLabel="รายการ"
          onPageChange={(nextPage) => setPageState({ page: nextPage, scopeKey })}
          onRowsPerPageChange={(nextRowsPerPage) => {
            setRowsPerPage(nextRowsPerPage);
            setPageState({ page: 1, scopeKey });
          }}
        />
      ) : null}
    </section>
  );
}
