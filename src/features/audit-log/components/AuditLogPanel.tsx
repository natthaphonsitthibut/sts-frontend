import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Badge,
  DatePicker,
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
import { DetailLinkButton } from "../../../components/layout/detail-link-button";
import {
  EmptyState,
  ErrorState,
} from "../../../components/layout/page-primitives";
import { Pagination } from "../../../components/layout/pagination";
import { ClearFiltersButton } from "../../../components/layout/clear-filters-button";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useRememberedState } from "../../../hooks/useRememberedState";
import {
  readIsoDateSearchParam,
  readPositiveIntegerSearchParam,
  readSortSearchParam,
  serializeSortSearchParam,
  useSyncedSearchParams,
} from "../../../hooks/useSyncedSearchParams";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { formatThaiDateTime } from "../../../lib/date-time";
import { cn } from "../../../lib/utils";
import {
  formatAuditLogDetails,
  getAuditLogTargetLabel,
} from "../lib/audit-log-presentation";
import { useAuditLog, useAuditLogActions } from "../hooks/useAuditLog";
import type {
  AuditLogActionOption,
  AuditLogDomain,
  AuditLogEntry,
  AuditLogTaskType,
} from "../types/audit-log.types";

interface AuditLogPanelProps {
  domain: AuditLogDomain;
  title: string;
  description?: string;
  province?: string;
  district?: string;
  subDistrict?: string;
  schoolId?: number;
  taskType?: AuditLogTaskType;
  targetType?: string;
  targetId?: string;
  caseId?: number;
  actionValues?: readonly string[];
  fixedAction?: string;
  showActionColumn?: boolean;
  showReferenceColumn?: boolean;
  className?: string;
  detailTo?: (entry: AuditLogEntry) => string;
}

function getAuditLogSortValue(entry: AuditLogEntry, key: string): string {
  if (key === "time") return entry.createdAt;
  if (key === "action") return entry.actionLabel;
  if (key === "actor") return entry.actorLabel;
  if (key === "reference") return getAuditLogTargetLabel(entry);
  if (key === "details") return formatAuditLogDetails(entry.details);
  return "";
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
        "grid gap-3 md:items-end",
        actionOptions.length > 0
          ? "md:grid-cols-[minmax(220px,1fr)_170px_150px_150px]"
          : "md:grid-cols-[minmax(220px,1fr)_150px_150px]",
      )}
    >
      <div className="space-y-1.5">
        <Label htmlFor="audit-search">ค้นหา</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="audit-search"
            className="pl-9"
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="ค้นหาผู้ทำรายการ"
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
        <DatePicker
          ariaLabel="จากวันที่"
          id="audit-date-from"
          max={dateTo || undefined}
          onChange={onDateFromChange}
          value={dateFrom}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="audit-date-to">ถึงวันที่</Label>
        <DatePicker
          ariaLabel="ถึงวันที่"
          id="audit-date-to"
          min={dateFrom || undefined}
          onChange={onDateToChange}
          value={dateTo}
        />
      </div>
    </div>
  );
}

function AuditLogTable({
  detailTo,
  entries,
  showActionColumn,
  showReferenceColumn,
}: {
  detailTo: (entry: AuditLogEntry) => string;
  entries: AuditLogEntry[];
  showActionColumn: boolean;
  showReferenceColumn: boolean;
}) {
  const [searchParams] = useSearchParams();
  const [sort, setSort] = useState<DataTableSortState | undefined>(() =>
    readSortSearchParam(searchParams, "auditSort", [
      "time",
      "action",
      "actor",
      "reference",
      "details",
    ]),
  );
  useSyncedSearchParams({ auditSort: serializeSortSearchParam(sort) });
  const hasExtraColumns = showActionColumn || showReferenceColumn;
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

  return (
    <>
      <DataTable
        headings={[
          { label: "เวลา", sortKey: "time" },
          ...(showActionColumn ? [{ label: "ประเภท", sortKey: "action" }] : []),
          { label: "ผู้ทำรายการ", sortKey: "actor" },
          ...(showReferenceColumn
            ? [{ label: "เป้าหมาย", sortKey: "reference" }]
            : []),
          { label: "รายละเอียด", sortKey: "details" },
          "เครื่องมือ",
        ]}
        columnWidths={[
          "w-[14%]",
          ...(showActionColumn
            ? [showReferenceColumn ? "w-[22%]" : "w-[24%]"]
            : []),
          hasExtraColumns
            ? showReferenceColumn
              ? "w-[14%]"
              : "w-[16%]"
            : "w-[26%]",
          ...(showReferenceColumn ? ["w-[18%]"] : []),
          showReferenceColumn
            ? "w-[17%]"
            : showActionColumn
              ? "w-[31%]"
              : "w-[45%]",
          "w-[15%]",
        ]}
        minWidthClassName="min-w-full"
        onSortChange={setSort}
        responsiveBreakpoint="lg"
        sort={sort}
      >
        {sortedEntries.map((entry) => (
          <DataTableRow key={entry.id}>
            <DataTableCell className="whitespace-nowrap text-sm font-medium tabular-nums text-slate-600">
              {formatThaiDateTime(entry.createdAt)}
            </DataTableCell>
            {showActionColumn ? (
              <DataTableCell>
                <Badge
                  className="whitespace-nowrap"
                  title={entry.actionLabel}
                  variant="secondary"
                >
                  {entry.actionLabel}
                </Badge>
              </DataTableCell>
            ) : null}
            <DataTableCell className="text-slate-800">
              <div className="truncate" title={entry.actorLabel}>
                {entry.actorLabel}
              </div>
            </DataTableCell>
            {showReferenceColumn ? (
              <DataTableCell className="text-sm text-slate-600">
                <div className="truncate" title={getAuditLogTargetLabel(entry)}>
                  {getAuditLogTargetLabel(entry)}
                </div>
              </DataTableCell>
            ) : null}
            <DataTableCell className="text-sm text-slate-600">
              <div
                className="line-clamp-2 break-words"
                title={formatAuditLogDetails(entry.details)}
              >
                {formatAuditLogDetails(entry.details)}
              </div>
            </DataTableCell>
            <DataTableCell>
              <div className="flex justify-end">
                <DetailLinkButton
                  className="min-w-[140px]"
                  size="sm"
                  to={detailTo(entry)}
                >
                  ดูรายละเอียด
                </DetailLinkButton>
              </div>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>
      <TableCardList desktopBreakpoint="lg">
        {sortedEntries.map((entry) => {
          return (
            <TableCard key={entry.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {showActionColumn ? (
                  <Badge variant="secondary">{entry.actionLabel}</Badge>
                ) : null}
                <time
                  className="text-sm font-medium tabular-nums text-slate-600"
                  dateTime={entry.createdAt}
                >
                  {formatThaiDateTime(entry.createdAt)}
                </time>
              </div>
              <div className="text-sm text-slate-900">{entry.actorLabel}</div>
              {showReferenceColumn ? (
                <div className="text-sm text-slate-600">
                  {getAuditLogTargetLabel(entry)}
                </div>
              ) : null}
              <div className="text-sm text-slate-600">
                {formatAuditLogDetails(entry.details)}
              </div>
              <div className="flex justify-end">
                <DetailLinkButton size="sm" to={detailTo(entry)}>
                  ดูรายละเอียด
                </DetailLinkButton>
              </div>
            </TableCard>
          );
        })}
      </TableCardList>
    </>
  );
}

export function AuditLogPanel({
  actionValues,
  caseId,
  className,
  description,
  detailTo = (entry) => `/audit-log/${entry.id}`,
  district,
  domain,
  fixedAction,
  province,
  schoolId,
  showActionColumn = true,
  showReferenceColumn = true,
  subDistrict,
  taskType,
  targetId,
  targetType,
  title,
}: AuditLogPanelProps) {
  const [searchParams] = useSearchParams();
  const scopeKey = `${province || ""}|${district || ""}|${subDistrict || ""}|${schoolId || ""}|${taskType || ""}|${targetType || ""}|${targetId || ""}|${caseId || ""}`;
  const [pageState, setPageState] = useState({
    page: readPositiveIntegerSearchParam(searchParams, "auditPage", 1),
    scopeKey,
  });
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const value = readPositiveIntegerSearchParam(
      searchParams,
      "auditLimit",
      DEFAULT_PAGE_SIZE,
    );
    return PAGE_SIZE_OPTIONS.includes(
      value as (typeof PAGE_SIZE_OPTIONS)[number],
    )
      ? value
      : DEFAULT_PAGE_SIZE;
  });
  const [searchTerm, setSearchTerm] = useRememberedState(
    `audit-log:${scopeKey}:search`,
    "",
  );
  const [action, setAction] = useState(
    () => searchParams.get("auditAction") ?? "",
  );
  const [dateFrom, setDateFrom] = useState(() =>
    readIsoDateSearchParam(searchParams, "auditFrom"),
  );
  const [dateTo, setDateTo] = useState(() =>
    readIsoDateSearchParam(searchParams, "auditTo"),
  );
  const hasValidDateRange = !dateFrom || !dateTo || dateFrom <= dateTo;
  const normalizedDateFrom = hasValidDateRange ? dateFrom : "";
  const normalizedDateTo = hasValidDateRange ? dateTo : "";
  const actionCatalog = useAuditLogActions({ domain, taskType }, !fixedAction);
  const actionOptions = useMemo(() => {
    const options = actionCatalog.data ?? [];
    return actionValues
      ? options.filter((option) => actionValues.includes(option.value))
      : options;
  }, [actionCatalog.data, actionValues]);
  const validatedAction =
    !action || actionOptions.some((option) => option.value === action)
      ? action
      : "";
  const normalizedAction = actionCatalog.isSuccess ? validatedAction : action;

  const debouncedSearchTerm = useDebouncedValue(searchTerm.trim(), 350);
  const hasActiveFilter = Boolean(
    debouncedSearchTerm ||
    normalizedAction ||
    normalizedDateFrom ||
    normalizedDateTo,
  );
  const page = pageState.scopeKey === scopeKey ? pageState.page : 1;
  useSyncedSearchParams({
    auditAction: fixedAction ? undefined : normalizedAction || undefined,
    auditFrom: normalizedDateFrom || undefined,
    auditTo: normalizedDateTo || undefined,
    auditPage: page > 1 ? page : undefined,
    auditLimit: rowsPerPage !== DEFAULT_PAGE_SIZE ? rowsPerPage : undefined,
  });

  const query = useMemo(
    () => ({
      domain,
      province,
      district,
      subDistrict,
      schoolId,
      caseId,
      taskType,
      targetType,
      targetId,
      action:
        fixedAction ||
        (actionCatalog.isSuccess ? validatedAction || undefined : undefined),
      searchTerm: debouncedSearchTerm || undefined,
      dateFrom: normalizedDateFrom || undefined,
      dateTo: normalizedDateTo || undefined,
      page,
      limit: rowsPerPage,
    }),
    [
      actionCatalog.isSuccess,
      caseId,
      normalizedDateFrom,
      normalizedDateTo,
      debouncedSearchTerm,
      district,
      domain,
      fixedAction,
      page,
      province,
      rowsPerPage,
      schoolId,
      subDistrict,
      taskType,
      targetId,
      targetType,
      validatedAction,
    ],
  );

  const auditLog = useAuditLog(query);
  const totalCount = auditLog.meta?.totalCount ?? auditLog.entries.length;

  function resetPageAnd(run: () => void): void {
    setPageState({ page: 1, scopeKey });
    run();
  }

  function clearFilters(): void {
    setSearchTerm("");
    setAction("");
    setDateFrom("");
    setDateTo("");
    setPageState({ page: 1, scopeKey });
  }

  return (
    <section className={cn("space-y-4", className)}>
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
            <span className="text-sm font-semibold text-slate-500">
              {auditLog.isFetching
                ? "กำลังอัปเดต"
                : `${totalCount.toLocaleString("en-US")} รายการ`}
            </span>
            <ClearFiltersButton onClear={clearFilters} />
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <AuditLogFilters
            action={normalizedAction}
            actionOptions={fixedAction ? [] : actionOptions}
            dateFrom={normalizedDateFrom}
            dateTo={normalizedDateTo}
            onActionChange={(value) => resetPageAnd(() => setAction(value))}
            onDateFromChange={(value) => resetPageAnd(() => setDateFrom(value))}
            onDateToChange={(value) => resetPageAnd(() => setDateTo(value))}
            onSearchTermChange={(value) =>
              resetPageAnd(() => setSearchTerm(value))
            }
            searchTerm={searchTerm}
          />
        </div>
      </div>

      {auditLog.isError || actionCatalog.isError ? (
        <ErrorState
          title="โหลดประวัติไม่สำเร็จ"
          onRetry={() => {
            auditLog.refetch();
            void actionCatalog.refetch();
          }}
        />
      ) : auditLog.isLoading || actionCatalog.isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">
          กำลังโหลดประวัติ
        </div>
      ) : auditLog.entries.length === 0 ? (
        <EmptyState
          icon={Search}
          title={
            hasActiveFilter
              ? "ไม่พบประวัติที่ค้นหา"
              : "ยังไม่มีประวัติการทำรายการ"
          }
          description={
            hasActiveFilter
              ? "ลองปรับตัวกรองหรือคำค้นหาใหม่อีกครั้ง"
              : undefined
          }
        />
      ) : (
        <AuditLogTable
          detailTo={detailTo}
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
          onPageChange={(nextPage) =>
            setPageState({ page: nextPage, scopeKey })
          }
          onRowsPerPageChange={(nextRowsPerPage) => {
            setRowsPerPage(nextRowsPerPage);
            setPageState({ page: 1, scopeKey });
          }}
        />
      ) : null}
    </section>
  );
}
