import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Camera,
  QrCode,
  ScanLine,
  UserRoundCheck,
  UserRoundSearch,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
} from "../../../components/base";
import { cn } from "../../../lib/utils";
import {
  getAttendanceStatusPresentation,
} from "../lib/attendance-presentation";
import {
  ATTENDANCE_QR_RECORD_STATUSES,
  ATTENDANCE_QR_SCAN_SOURCES,
  getAttendanceQrCandidateValue,
  type AttendanceQrScanSource,
} from "../lib/attendance-qr-presentation";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";
import type { AttendanceSelectionStatus } from "../types/attendance.types";

type RecordableStatus = Exclude<AttendanceSelectionStatus, "NONE">;

const QR_CAMERA_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: "environment" },
  height: { ideal: 720 },
  width: { ideal: 1280 },
};

interface NativeBarcodeDetector {
  detect: (image: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
}

interface NativeBarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): NativeBarcodeDetector;
}

interface ScanRosterRow {
  avatar: ReactNode;
  id: string;
  name: string;
  studentNumber?: string | null;
}

interface ScanEntry {
  row: ScanRosterRow;
  status: RecordableStatus;
  scannedAt: Date;
  unchanged: boolean;
}

interface ScanError {
  message: string;
  value: string;
}

export interface AttendanceQrScannerDialogProps {
  catalog: readonly StatusCatalogItem[];
  disabled?: boolean;
  onMark: (studentId: string, status: RecordableStatus) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  rows: readonly ScanRosterRow[];
  selections: Readonly<Record<string, AttendanceSelectionStatus>>;
}

function normalizeScanValue(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("th-TH");
}

function getBarcodeDetectorConstructor(): NativeBarcodeDetectorConstructor | null {
  return (
    (globalThis as unknown as {
      BarcodeDetector?: NativeBarcodeDetectorConstructor;
    }).BarcodeDetector ?? null
  );
}

function formatScannedTime(value: Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

/**
 * Camera QR scanner for a roster already in memory. It deliberately only
 * resolves within the supplied rows: the existing attendance autosave APIs
 * remain the server-side authority for every scope and session rule.
 */
export function AttendanceQrScannerDialog({
  catalog,
  disabled = false,
  onMark,
  onOpenChange,
  open,
  rows,
  selections,
}: AttendanceQrScannerDialogProps) {
  const [source, setSource] = useState<AttendanceQrScanSource>(
    ATTENDANCE_QR_SCAN_SOURCES[0].value,
  );
  const [status, setStatus] = useState<RecordableStatus>(
    ATTENDANCE_QR_RECORD_STATUSES[0],
  );
  const [lastScannedValue, setLastScannedValue] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [scanError, setScanError] = useState<ScanError | null>(null);
  const [entries, setEntries] = useState<ScanEntry[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastValueRef = useRef<{ value: string; scannedAt: number } | null>(null);
  const scanAlertOpenRef = useRef(false);

  const sourceOption =
    ATTENDANCE_QR_SCAN_SOURCES.find((option) => option.value === source) ??
    ATTENDANCE_QR_SCAN_SOURCES[0];
  const sourceLabel = sourceOption.label;
  const canRequestCamera = Boolean(navigator.mediaDevices?.getUserMedia);

  useEffect(() => {
    scanAlertOpenRef.current = scanError !== null;
  }, [scanError]);

  const resetScannerSession = useCallback(() => {
    lastValueRef.current = null;
    scanAlertOpenRef.current = false;
    setSource(ATTENDANCE_QR_SCAN_SOURCES[0].value);
    setStatus(ATTENDANCE_QR_RECORD_STATUSES[0]);
    setEntries([]);
    setLastScannedValue(null);
    setNotice(null);
    setScanError(null);
  }, []);

  const matchValue = useCallback(
    (rawValue: string) => {
      const value = normalizeScanValue(rawValue);
      if (!value) return;
      setLastScannedValue(rawValue.trim());
      const matchedRows = rows.filter((row) => {
        const candidate = getAttendanceQrCandidateValue(row, source);
        return normalizeScanValue(candidate) === value;
      });

      if (matchedRows.length === 0) {
        setScanError({
          value: rawValue.trim(),
          message: "ข้อมูลใน QR Code ไม่ตรงกับข้อมูลนักเรียนที่เลือกไว้ หรือไม่พบในรายชื่อห้อง",
        });
        return;
      }
      if (matchedRows.length > 1) {
        setScanError({
          value: rawValue.trim(),
          message: "พบชื่อนักเรียนซ้ำในห้อง กรุณาเลือกสแกนด้วยรหัสประจำตัว",
        });
        return;
      }

      const row = matchedRows[0];
      const unchanged = selections[row.id] === status;
      if (!unchanged) onMark(row.id, status);
      setEntries((current) => [
        { row, status, scannedAt: new Date(), unchanged },
        ...current,
      ].slice(0, 12));
      setNotice(
        unchanged
          ? `${row.name} มีสถานะนี้อยู่แล้ว`
          : `บันทึก ${row.name} เป็น${getAttendanceStatusPresentation(status, catalog).shortLabel}`,
      );
    },
    [catalog, onMark, rows, selections, source, status],
  );

  useEffect(() => {
    if (!open || disabled || !canRequestCamera) return;

    const BarcodeDetector = getBarcodeDetectorConstructor();
    let stream: MediaStream | null = null;
    let frameId: number | null = null;
    let scannerControls: { stop: () => void } | null = null;
    let cancelled = false;
    const video = videoRef.current;
    if (!video) return;
    const activeVideo: HTMLVideoElement = video;
    const detector = BarcodeDetector
      ? new BarcodeDetector({ formats: ["qr_code"] })
      : null;

    const stopVideoStream = (): void => {
      const attachedStream = activeVideo.srcObject as MediaStream | null;
      attachedStream?.getTracks().forEach((track) => track.stop());
      activeVideo.pause();
      activeVideo.srcObject = null;
    };

    const handleDecodedValue = (value: string): void => {
      if (scanAlertOpenRef.current) return;
      const now = Date.now();
      const previous = lastValueRef.current;
      if (previous?.value === value && now - previous.scannedAt < 1_500) return;
      lastValueRef.current = { value, scannedAt: now };
      matchValue(value);
    };

    async function startCamera(): Promise<void> {
      try {
        if (!detector) {
          // BarcodeDetector is not shipped by every browser. ZXing owns the
          // JavaScript decoder, so Safari and Firefox receive the same camera
          // permission prompt. We retain the stream ourselves so closing the
          // dialog can always stop its physical camera tracks.
          const { BrowserQRCodeReader } = await import("@zxing/browser");
          // QR-only decoding avoids the work of testing every barcode format.
          // 150ms is responsive without overworking typical school devices.
          const reader = new BrowserQRCodeReader(undefined, {
            delayBetweenScanAttempts: 150,
            delayBetweenScanSuccess: 150,
          });
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: QR_CAMERA_CONSTRAINTS,
          });
          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          const controls = await reader.decodeFromStream(
            stream,
            activeVideo,
            (result) => {
              const value = result?.getText().trim();
              if (value) handleDecodedValue(value);
            },
          );
          // The dialog may have closed while ZXing was waiting for the camera
          // permission. In that case its stream started after React ran this
          // effect's cleanup, so it must be stopped here instead of leaking
          // the camera indicator.
          if (cancelled) {
            controls.stop();
            stopVideoStream();
            return;
          }
          scannerControls = controls;
          setNotice("หันกล้องไปที่ QR ของนักเรียน");
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: QR_CAMERA_CONSTRAINTS,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        activeVideo.srcObject = stream;
        await activeVideo.play();
        setNotice("หันกล้องไปที่ QR ของนักเรียน");

        const scanNextFrame = (): void => {
          if (cancelled) return;
          if (activeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            void detector.detect(activeVideo).then((codes) => {
              const value = codes[0]?.rawValue?.trim();
              if (!value) return;
              handleDecodedValue(value);
            }).catch(() => {
              // A single bad frame is normal while a camera focuses. Keep
              // scanning; getUserMedia errors are handled separately below.
            });
          }
          frameId = window.requestAnimationFrame(scanNextFrame);
        };
        frameId = window.requestAnimationFrame(scanNextFrame);
      } catch {
        setNotice("เปิดกล้องไม่สำเร็จ โปรดอนุญาตใช้กล้องแล้วลองอีกครั้ง");
      }
    }

    void startCamera();
    return () => {
      cancelled = true;
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      scannerControls?.stop();
      stream?.getTracks().forEach((track) => track.stop());
      stopVideoStream();
    };
  }, [canRequestCamera, disabled, matchValue, open]);

  const statusOptions = useMemo(
    () =>
      ATTENDANCE_QR_RECORD_STATUSES.map((value) => ({
        value,
        presentation: getAttendanceStatusPresentation(value, catalog),
      })),
    [catalog],
  );

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetScannerSession();
        onOpenChange(nextOpen);
      }}
      open={open}
    >
      <DialogContent
        className="max-w-3xl p-6"
        onClose={() => {
          resetScannerSession();
          onOpenChange(false);
        }}
      >
        <DialogHeader className="flex flex-col gap-1 space-y-0 sm:flex-row sm:items-center sm:gap-4">
          <DialogTitle icon={QrCode}>สแกน QR Code เพื่อเช็กชื่อ</DialogTitle>
          <DialogDescription>
            เลือกข้อมูลที่โรงเรียนบันทึกไว้ใน QR ก่อนเริ่มสแกน
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {disabled ? (
            <Alert variant="warning">
              <AlertDescription>รอบเช็กชื่อนี้ปิดแล้ว จึงไม่สามารถสแกนเพิ่มได้</AlertDescription>
            </Alert>
          ) : null}

          <div className="w-full max-w-sm space-y-1.5">
            <Label htmlFor="attendance-qr-source">ข้อมูลที่บันทึกใน QR Code</Label>
            <Select
              id="attendance-qr-source"
              onChange={(event) => {
                setSource(event.target.value as AttendanceQrScanSource);
                setNotice(null);
                setScanError(null);
              }}
              value={source}
            >
              {ATTENDANCE_QR_SCAN_SOURCES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <div className="space-y-4">
              <div
                aria-label="สถานะเมื่อสแกน"
                className="flex gap-2"
                role="group"
              >
                {statusOptions.map(({ value, presentation }) => (
                  <button
                    aria-pressed={status === value}
                    className={cn(
                      "inline-flex h-11 flex-1 items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      status === value
                        ? presentation.pillActiveClass
                        : `bg-white ${presentation.pillIdleClass}`,
                    )}
                    key={value}
                    onClick={() => setStatus(value)}
                    type="button"
                  >
                    {presentation.shortLabel}
                  </button>
                ))}
              </div>
              <section
                aria-label="กล้องสแกน QR"
                className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950"
              >
                {canRequestCamera ? (
                  <div className="relative h-[320px] max-h-[48svh] w-full bg-slate-900 sm:h-[400px] sm:max-h-[52vh]">
                    <video
                      autoPlay
                      className="size-full object-cover"
                      muted
                      playsInline
                      ref={videoRef}
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-[18%] rounded-lg border-2 border-white shadow-[0_0_0_999px_rgba(15,23,42,0.25)]"
                    />
                    <ScanLine
                      aria-hidden="true"
                      className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 text-white"
                    />
                  </div>
                ) : (
                  <div className="flex h-[320px] max-h-[48svh] flex-col items-center justify-center gap-3 px-6 text-center text-white sm:h-[400px] sm:max-h-[52vh]">
                    <Camera aria-hidden="true" className="size-10" />
                    <p className="font-medium">อุปกรณ์นี้ไม่สามารถขอใช้กล้องได้</p>
                    <p className="text-sm text-slate-300">โปรดเปิดผ่าน HTTPS หรือใช้อุปกรณ์ที่มีกล้อง</p>
                  </div>
                )}
              </section>
              {notice ? <p className="text-sm text-slate-600">{notice}</p> : null}
            </div>

            <section
              aria-live="polite"
              className="flex min-h-[300px] flex-col rounded-xl border border-slate-200 bg-slate-50 p-4 sm:min-h-[456px] lg:h-[456px]"
            >
              <div className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
                <UserRoundCheck aria-hidden="true" className="size-5 text-primary" />
                รายการที่สแกน
              </div>
              {entries.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-slate-500">
                  <UserRoundSearch aria-hidden="true" className="size-8" />
                  ไม่มีข้อมูลการเช็กชื่อ
                </div>
              ) : (
                <ul className="space-y-2 overflow-y-auto pr-1">
                  {entries.map((entry, index) => {
                    const presentation = getAttendanceStatusPresentation(entry.status, catalog);
                    return (
                      // The row itself carries the status colour — the same
                      // treatment a selected record button uses, so มา and สาย
                      // read identically here and in the roster.
                      <li
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-2.5 shadow-sm",
                          presentation.activeClass,
                        )}
                        key={`${entry.row.id}-${entry.scannedAt.getTime()}-${index}`}
                      >
                        <div className="shrink-0">{entry.row.avatar}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-slate-900">{entry.row.name}</p>
                          <p className="truncate text-xs text-slate-600">
                            รหัสประจำตัว: {entry.row.studentNumber || "-"}
                            {entry.unchanged ? " · สถานะเดิม" : ""}
                          </p>
                        </div>
                        <time
                          className="shrink-0 text-xs font-medium text-slate-600"
                          dateTime={entry.scannedAt.toISOString()}
                        >
                          {formatScannedTime(entry.scannedAt)}
                        </time>
                        <span className="sr-only">{presentation.shortLabel}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-600">ค่าที่อ่านล่าสุดจาก QR ({sourceLabel})</p>
            <p className="mt-1 truncate text-xl font-semibold tabular-nums text-slate-900 sm:text-2xl" data-attendance-qr-last-value>
              {lastScannedValue ?? "กำลังรอการสแกน"}
            </p>
          </div>
        </DialogBody>
        {scanError ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/45 p-4">
            <section
              aria-label="ไม่สามารถเช็กชื่อจาก QR Code นี้ได้"
              aria-modal="true"
              className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
              role="alertdialog"
            >
              <Alert variant="destructive">
                <AlertTitle>ไม่สามารถเช็กชื่อจาก QR Code นี้ได้</AlertTitle>
                <AlertDescription>{scanError.message}</AlertDescription>
              </Alert>
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-600">
                  ค่าที่ตรวจพบจาก QR ({sourceLabel})
                </p>
                <p className="mt-1 break-all text-xl font-semibold tabular-nums text-slate-900 sm:text-2xl">
                  {scanError.value}
                </p>
              </div>
              <div className="mt-5 flex justify-end">
                <Button onClick={() => setScanError(null)}>สแกนต่อ</Button>
              </div>
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
