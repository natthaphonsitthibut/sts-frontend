import { Download, FileSpreadsheet, FileText, ListChecks, Sheet } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Button,
  Checkbox,
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
  authorizeExport: (format: RosterExportFormat, columns: string[]) => Promise<void>;
  columns: readonly RosterExportColumn[];
  fileName: string;
  loadRows: () => Promise<Record<string, string>[]>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}

export function ClassroomTableExportDialog({
  authorizeExport,
  columns: availableColumns,
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
    setIsExporting(true);
    setError(null);
    try {
      await authorizeExport(format, columns.map((column) => column.key));
      const rows = await loadRows();
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
