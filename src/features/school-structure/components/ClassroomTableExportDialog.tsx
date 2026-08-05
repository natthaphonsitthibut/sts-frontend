import { CalendarRange, Download, FileSpreadsheet, FileText, ListChecks, Sheet } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  DatePicker,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/base";
import { cn } from "../../../lib/utils";
import {
  exportRosterFile,
  type RosterExportColumn,
  type RosterExportFormat,
} from "../lib/classroom-roster-export";

const FORMAT_OPTIONS = [
  { value: "pdf", label: "PDF Document", icon: FileText },
  { value: "xlsx", label: "Excel (.xlsx)", icon: FileSpreadsheet },
  { value: "csv", label: "CSV File", icon: Sheet },
] as const;

interface ClassroomTableExportDialogProps {
  /**
   * Server-side permission + audit step. Omitted for teacher-link exports, which
   * only re-save rows the link already displayed (and whose read is audited on
   * the grant itself).
   */
  authorizeExport?: (
    format: RosterExportFormat,
    columns: string[],
    dateRange?: ExportDateRange,
  ) => Promise<void>;
  columns: readonly RosterExportColumn[];
  enableDateRange?: boolean;
  fileName: string;
  loadRows: (dateRange?: ExportDateRange) => Promise<Record<string, string>[]>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}

export interface ExportDateRange {
  dateFrom: string;
  dateTo: string;
}

export function ClassroomTableExportDialog({
  authorizeExport,
  columns: availableColumns,
  enableDateRange = false,
  fileName,
  loadRows,
  onOpenChange,
  open,
  title,
}: ClassroomTableExportDialogProps) {
  const [format, setFormat] = useState<RosterExportFormat>("pdf");
  const availableColumnKeys = useMemo(
    () => availableColumns.map((column) => column.key),
    [availableColumns],
  );
  const columnSchema = availableColumnKeys.join("\u0000");
  const [columnSelection, setColumnSelection] = useState(() => ({
    schema: columnSchema,
    keys: availableColumnKeys,
  }));
  const selectedColumns =
    columnSelection.schema === columnSchema ? columnSelection.keys : availableColumnKeys;
  const [isExporting, setIsExporting] = useState(false);
  const [rangeMode, setRangeMode] = useState<"ALL" | "CUSTOM">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const columns = useMemo(
    () => availableColumns.filter((column) => selectedColumns.includes(column.key)),
    [availableColumns, selectedColumns],
  );

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  }

  async function handleExport(): Promise<void> {
    if (columns.length === 0) return;
    const dateRange =
      enableDateRange && rangeMode === "CUSTOM" && dateFrom && dateTo
        ? { dateFrom, dateTo }
        : undefined;
    if (enableDateRange && rangeMode === "CUSTOM" && (!dateFrom || !dateTo)) {
      setError("กรุณาเลือกวันเริ่มและวันจบ");
      return;
    }
    if (dateRange && dateRange.dateFrom > dateRange.dateTo) {
      setError("วันเริ่มต้องไม่เกินวันจบ");
      return;
    }
    setIsExporting(true);
    setError(null);
    try {
      await authorizeExport?.(format, columns.map((column) => column.key), dateRange);
      const rows = await loadRows(dateRange);
      exportRosterFile(
        format,
        fileName,
        title,
        [...columns],
        rows.map((row) => columns.map((column) => row[column.key] ?? "-")),
      );
      handleOpenChange(false);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "ดาวน์โหลดไฟล์ไม่สำเร็จ");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-w-xl" onClose={() => handleOpenChange(false)}>
        <DialogHeader>
          <DialogTitle icon={Download}>ดาวน์โหลดไฟล์</DialogTitle>
        </DialogHeader>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
            <FileText className="size-4" aria-hidden="true" /> เลือกรูปแบบไฟล์
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {FORMAT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = format === option.value;
              return (
                <button
                  aria-pressed={selected}
                  className={cn(
                    "flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border bg-white px-3 py-4 text-sm transition-colors",
                    selected
                      ? "border-primary text-primary ring-1 ring-primary"
                      : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                  )}
                  key={option.value}
                  onClick={() => setFormat(option.value)}
                  type="button"
                >
                  <Icon className="size-7" aria-hidden="true" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-4 border-t border-slate-200 pt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <ListChecks className="size-4" aria-hidden="true" /> เลือกคอลัมน์ที่ต้องการ
            </h3>
            <div className="flex gap-3 text-xs font-semibold">
              <button className="text-slate-700 hover:text-primary" onClick={() => setColumnSelection({ schema: columnSchema, keys: availableColumnKeys })} type="button">เลือกทั้งหมด</button>
              <button className="text-slate-700 hover:text-primary" onClick={() => setColumnSelection({ schema: columnSchema, keys: [] })} type="button">ล้างทั้งหมด</button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {availableColumns.map((column) => (
              <Checkbox
                checked={selectedColumns.includes(column.key)}
                key={column.key}
                label={column.label}
                onChange={(event) => setColumnSelection({
                  schema: columnSchema,
                  keys: event.target.checked
                    ? [...selectedColumns, column.key]
                    : selectedColumns.filter((key) => key !== column.key),
                })}
              />
            ))}
          </div>
        </section>

        {enableDateRange ? (
          <section className="mt-4 border-t border-slate-200 pt-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
              <CalendarRange className="size-4" aria-hidden="true" /> เลือกช่วงข้อมูล
            </h3>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-800">
              {([
                ["ALL", "ทั้งหมด"],
                ["CUSTOM", "กำหนดเอง"],
              ] as const).map(([value, label]) => (
                <label className="inline-flex cursor-pointer items-center gap-2" key={value}>
                  <input
                    checked={rangeMode === value}
                    className="size-4 accent-primary"
                    name="export-date-range"
                    onChange={() => { setRangeMode(value); setError(null); }}
                    type="radio"
                    value={value}
                  />
                  {label}
                </label>
              ))}
            </div>
            {rangeMode === "CUSTOM" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <DatePicker
                  ariaLabel="วันเริ่มสำหรับส่งออกข้อมูล"
                  max={dateTo || undefined}
                  onChange={setDateFrom}
                  placeholder="วันเริ่ม"
                  value={dateFrom}
                />
                <DatePicker
                  ariaLabel="วันจบสำหรับส่งออกข้อมูล"
                  min={dateFrom || undefined}
                  onChange={setDateTo}
                  placeholder="วันจบ"
                  value={dateTo}
                />
              </div>
            ) : null}
          </section>
        ) : null}

        {error ? <p className="mt-4 text-sm font-medium text-danger">{error}</p> : null}

        <DialogFooter className="grid grid-cols-2 sm:grid">
          <Button fullWidth onClick={() => handleOpenChange(false)} variant="secondary">ยกเลิก</Button>
          <Button
            disabled={columns.length === 0}
            fullWidth
            icon={Download}
            isLoading={isExporting}
            loadingText="กำลังเตรียมไฟล์"
            onClick={() => void handleExport()}
          >
            ดาวน์โหลด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
