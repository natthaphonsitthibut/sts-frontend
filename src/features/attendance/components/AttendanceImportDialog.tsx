import { useMemo, useState } from "react";
import { CalendarCheck, Download, FileSpreadsheet, UploadCloud } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FileDropzone,
  Input,
  Label,
  LinkButton,
  appToast,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
} from "../../../components/layout/data-table";
import { Pagination } from "../../../components/layout/pagination";
import { SummaryMetrics } from "../../../components/layout/page-primitives";
import { PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { getApiErrorMessage } from "../../../lib/api-error";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";
import type { AttendanceSelectionStatus } from "../types/attendance.types";
import {
  ATTENDANCE_IMPORT_PREVIEW_COLUMNS,
  attendanceImportStatusLegend,
  buildAttendanceImportPreviewRows,
  downloadAttendanceImportTemplate,
  resolveAttendanceImport,
  type AttendanceImportRecordableStatus,
  type AttendanceImportRosterRow,
  type AttendanceImportResult,
  type AttendanceImportSheet,
} from "../lib/attendance-import";

export interface AttendanceImportDialogProps {
  catalog: readonly StatusCatalogItem[];
  /** Names the downloaded form, e.g. `แบบฟอร์มเช็กชื่อ-ม.4-1-2026-08-15`. */
  classLabel: string;
  /** Round the marks land in, shown read-only: the page already chose it. */
  contextLabel: string;
  disabled?: boolean;
  onMark: (studentId: string, status: AttendanceImportRecordableStatus) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  /** Reads the spreadsheet server-side; each surface passes its own transport. */
  parseSheet: (input: { file?: File; url?: string }) => Promise<AttendanceImportSheet>;
  /**
   * Keeps the applied import in ประวัติ → นำเข้าไฟล์. Optional so a surface that
   * cannot record (no classroom resolved yet) still imports.
   */
  recordImport?: (input: {
    file?: File;
    sourceUrl?: string;
    fileName: string;
    rowCount: number;
    appliedCount: number;
  }) => Promise<void>;
  rows: readonly AttendanceImportRosterRow[];
  selections: Readonly<Record<string, AttendanceSelectionStatus>>;
}

type ImportView = "upload" | "sample";

const PREVIEW_ROW_LIMIT = 50;

/**
 * Reads an attendance spreadsheet — uploaded or behind a share link — into the
 * roster on screen. Nothing is submitted here: the rows land as marks the
 * teacher reviews and saves with the page's own save action, the same way the
 * QR scanner works.
 */
export function AttendanceImportDialog({
  catalog,
  classLabel,
  contextLabel,
  disabled = false,
  onMark,
  onOpenChange,
  open,
  parseSheet,
  recordImport,
  rows,
  selections,
}: AttendanceImportDialogProps) {
  const [view, setView] = useState<ImportView>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [sheet, setSheet] = useState<AttendanceImportSheet | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  /** A reopened dialog must never show the previous file's result. */
  function closeAndReset(): void {
    setView("upload");
    setFile(null);
    setUrl("");
    setSheet(null);
    setParseError(null);
    setIsParsing(false);
    setPage(1);
    onOpenChange(false);
  }

  const result: AttendanceImportResult | null = useMemo(
    () => (sheet ? resolveAttendanceImport(sheet, rows, catalog, selections) : null),
    [catalog, rows, selections, sheet],
  );

  const previewRows = useMemo(
    () => buildAttendanceImportPreviewRows(rows.slice(0, PREVIEW_ROW_LIMIT), catalog),
    [catalog, rows],
  );
  const pagedPreviewRows = previewRows.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage,
  );
  const statusLegend = attendanceImportStatusLegend(catalog);

  async function runParse(input: { file?: File; url?: string }): Promise<void> {
    setIsParsing(true);
    setParseError(null);
    setSheet(null);
    try {
      setSheet(await parseSheet(input));
    } catch (error) {
      setParseError(getApiErrorMessage(error, "อ่านไฟล์ไม่สำเร็จ"));
    } finally {
      setIsParsing(false);
    }
  }

  function handleFileSelect(next: File | null): void {
    setFile(next);
    setUrl("");
    setSheet(null);
    setParseError(null);
    if (next) void runParse({ file: next });
  }

  function handleApply(): void {
    if (!result || result.matches.length === 0) return;
    for (const match of result.matches) {
      if (!match.unchanged) onMark(match.studentId, match.status);
    }
    // Recorded after the marks land, so an abandoned preview never shows up as
    // history; a failure here must not undo the import the teacher just made.
    void recordImport?.({
      file: file ?? undefined,
      sourceUrl: file ? undefined : url.trim() || undefined,
      fileName: file?.name ?? sheet?.origin ?? "ไฟล์เช็กชื่อ",
      rowCount: result.matches.length,
      appliedCount: result.changedCount,
    }).catch(() => undefined);
    appToast.success(
      `นำเข้าการเช็กชื่อ ${result.changedCount} คน — ตรวจสอบแล้วกดบันทึกการเช็กชื่อ`,
    );
    closeAndReset();
  }

  const canApply =
    !disabled && !isParsing && (result?.matches.length ?? 0) > 0;

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (nextOpen) onOpenChange(true);
        else closeAndReset();
      }}
      open={open}
    >
      <DialogContent className="max-w-2xl p-6" onClose={closeAndReset}>
        <DialogHeader>
          <DialogTitle icon={UploadCloud}>นำเข้าไฟล์การเช็กชื่อ</DialogTitle>
        </DialogHeader>

        {view === "upload" ? (
          <>
            <DialogBody className="space-y-5">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <CalendarCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />
                <span className="font-medium">วันที่เช็กชื่อ</span>
                <span className="ml-auto text-right font-semibold text-slate-900">
                  {contextLabel}
                </span>
              </div>

              {disabled ? (
                <Alert variant="warning">
                  <AlertDescription>
                    รอบเช็กชื่อนี้ปิดแล้ว จึงนำเข้าไฟล์เพิ่มไม่ได้
                  </AlertDescription>
                </Alert>
              ) : null}

              <section className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>อัปโหลดไฟล์</Label>
                  <LinkButton
                    onClick={() => {
                      setPage(1);
                      setView("sample");
                    }}
                  >
                    ตัวอย่างไฟล์
                  </LinkButton>
                </div>
                <FileDropzone
                  disabled={disabled || isParsing}
                  file={file}
                  hint="รองรับไฟล์ .xlsx และ .csv (ขนาดสูงสุด 10 MB)"
                  label="ลากและวางไฟล์ Excel ที่นี่ หรือคลิกเพื่อเลือกไฟล์"
                  onFileSelect={handleFileSelect}
                  size="panel"
                />
              </section>

              <section className="space-y-2">
                <Label htmlFor="attendance-import-url">หรือนำเข้าจาก URL</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    className="flex-1"
                    disabled={disabled || isParsing}
                    id="attendance-import-url"
                    onChange={(event) => {
                      setUrl(event.target.value);
                      setFile(null);
                      setSheet(null);
                      setParseError(null);
                    }}
                    placeholder="วางลิงก์ Google Sheet หรือไฟล์ Excel"
                    value={url}
                  />
                  <Button
                    disabled={disabled || url.trim().length === 0}
                    isLoading={isParsing && !file}
                    onClick={() => void runParse({ url: url.trim() })}
                  >
                    นำเข้า
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  ลิงก์ต้องแชร์แบบ “ผู้ที่มีลิงก์” และรองรับ Google Sheets, Google Drive,
                  OneDrive และ SharePoint
                </p>
              </section>

              {parseError ? (
                <Alert variant="destructive">
                  <AlertTitle>อ่านไฟล์ไม่สำเร็จ</AlertTitle>
                  <AlertDescription>{parseError}</AlertDescription>
                </Alert>
              ) : null}

              {result ? <ImportSummary result={result} sheet={sheet} /> : null}
            </DialogBody>

            <DialogFooter className="sm:grid sm:grid-cols-2 sm:[&>button]:w-full">
              <Button onClick={closeAndReset} variant="secondary">
                ยกเลิก
              </Button>
              <Button disabled={!canApply} onClick={handleApply}>
                บันทึกข้อมูล
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogBody className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">ตัวอย่างไฟล์นำเข้า</p>
                <p className="text-xs text-slate-500">
                  ช่องสถานะกรอกได้: {statusLegend.join(" / ")}
                </p>
              </div>
              <DataTable
                headings={ATTENDANCE_IMPORT_PREVIEW_COLUMNS.map((column) => ({
                  label: column.label,
                }))}
                minWidthClassName="min-w-[520px]"
                responsive={false}
              >
                {pagedPreviewRows.map((row) => (
                  <DataTableRow key={row[0]}>
                    {row.map((cell, cellIndex) => (
                      <DataTableCell
                        className={cellIndex === 3 ? "font-medium text-slate-900" : undefined}
                        key={ATTENDANCE_IMPORT_PREVIEW_COLUMNS[cellIndex].key}
                      >
                        {cell || "-"}
                      </DataTableCell>
                    ))}
                  </DataTableRow>
                ))}
              </DataTable>
              <Pagination
                onPageChange={setPage}
                onRowsPerPageChange={(nextRowsPerPage) => {
                  setRowsPerPage(nextRowsPerPage);
                  setPage(1);
                }}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                totalCount={previewRows.length}
              />
              <p className="text-xs text-slate-500">
                ตัวอย่างและแบบฟอร์มเรียงตามลำดับเดียวกับตารางเช็กชื่อที่เปิดอยู่
                และมีรายชื่อห้องนี้ครบทุกคน โดยช่องสถานะเป็นตัวเลือกให้กด ไม่ต้องพิมพ์เอง
              </p>
            </DialogBody>

            <DialogFooter className="sm:grid sm:grid-cols-2 sm:[&>button]:w-full">
              <Button onClick={() => setView("upload")} variant="secondary">
                ย้อนกลับ
              </Button>
              <Button
                disabled={rows.length === 0}
                icon={Download}
                onClick={() =>
                  downloadAttendanceImportTemplate(
                    rows,
                    catalog,
                    `แบบฟอร์มเช็กชื่อ-${classLabel}`,
                  )
                }
              >
                ดาวน์โหลดแบบฟอร์ม
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ImportSummary({
  result,
  sheet,
}: {
  result: AttendanceImportResult;
  sheet: AttendanceImportSheet | null;
}) {
  if (result.missingColumns.length > 0) {
    return (
      <Alert variant="destructive">
        <AlertTitle>ไฟล์ไม่มีคอลัมน์ที่ต้องใช้</AlertTitle>
        <AlertDescription>
          ไม่พบคอลัมน์ {result.missingColumns.join(", ")} — ดาวน์โหลดแบบฟอร์มจาก “ตัวอย่างไฟล์”
          แล้วกรอกในไฟล์นั้น
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <FileSpreadsheet aria-hidden="true" className="size-4 text-primary" />
        อ่านไฟล์แล้ว {sheet?.rows.length ?? 0} แถว
      </div>
      <SummaryMetrics
        columns={3}
        items={[
          {
            label: "จับคู่นักเรียนได้",
            value: result.matches.length,
            hideComparison: true,
            tone: result.matches.length > 0 ? "success" : "danger",
          },
          {
            label: "สถานะที่เปลี่ยน",
            value: result.changedCount,
            hideComparison: true,
          },
          {
            label: "แถวที่มีปัญหา",
            value: result.issues.length,
            hideComparison: true,
            tone: result.issues.length > 0 ? "warning" : "default",
          },
        ]}
      />

      {sheet?.truncated ? (
        <Alert variant="warning">
          <AlertDescription>
            ไฟล์มีแถวมากกว่าที่ระบบอ่านได้ จึงอ่านเฉพาะส่วนแรกของไฟล์
          </AlertDescription>
        </Alert>
      ) : null}

      {result.issues.length > 0 ? (
        <Alert variant="warning">
          <AlertTitle>แถวที่นำเข้าไม่ได้ ({result.issues.length})</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto">
              {result.issues.map((issue) => (
                <li key={`${issue.rowNumber}-${issue.reason}`}>
                  แถวที่ {issue.rowNumber} · {issue.label} — {issue.detail}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {result.matches.length === 0 ? (
        <Alert variant="destructive">
          <AlertDescription>
            ไม่มีแถวที่นำเข้าได้ กรุณาตรวจรหัสประจำตัวและสถานะในไฟล์
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
