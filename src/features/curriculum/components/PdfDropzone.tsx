import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { FileText, Trash2, UploadCloud } from "lucide-react";
import { IconButton } from "../../../components/base";
import { formatFileSize } from "../../../lib/file-size";
import { cn } from "../../../lib/utils";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export interface PdfDropzoneProps {
  /** File chosen but not yet uploaded. */
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Already-stored file, shown until it is replaced or removed. */
  storedFileName?: string | null;
  storedFileSizeBytes?: number | null;
  onRemoveStored?: () => void;
  storedRemoved?: boolean;
  disabled?: boolean;
}

/** Drag-and-drop PDF picker for the subject's learning content. */
export function PdfDropzone({
  file,
  onFileChange,
  storedFileName,
  storedFileSizeBytes,
  onRemoveStored,
  storedRemoved,
  disabled,
}: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function accept(candidate: File | null): void {
    if (!candidate) return;
    if (candidate.type !== "application/pdf") {
      setError("รองรับเฉพาะไฟล์ PDF เท่านั้น");
      return;
    }
    if (candidate.size > MAX_SIZE_BYTES) {
      setError("ไฟล์ใหญ่เกิน 10MB");
      return;
    }
    setError(null);
    onFileChange(candidate);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>): void {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    accept(selected);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    accept(event.dataTransfer.files?.[0] ?? null);
  }

  const showStored = Boolean(storedFileName) && !storedRemoved && !file;

  return (
    <div className="flex flex-col gap-3">
      {showStored ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <FileText className="size-6 shrink-0 text-danger" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">
                {storedFileName}
              </p>
              {storedFileSizeBytes ? (
                <p className="text-xs text-slate-500">
                  {formatFileSize(storedFileSizeBytes)}
                </p>
              ) : null}
            </div>
          </div>
          {onRemoveStored ? (
            <IconButton
              aria-label={`นำไฟล์ ${storedFileName} ออก`}
              disabled={disabled}
              icon={Trash2}
              onClick={onRemoveStored}
              variant="delete"
            />
          ) : null}
        </div>
      ) : null}

      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <FileText className="size-6 shrink-0 text-danger" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
              <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <IconButton
            aria-label={`นำไฟล์ ${file.name} ออก`}
            disabled={disabled}
            icon={Trash2}
            onClick={() => onFileChange(null)}
            variant="delete"
          />
        </div>
      ) : null}

      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
          isDragging ? "border-primary bg-primary-soft" : "border-primary/40 bg-primary-soft/40",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        )}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDrop={handleDrop}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        <UploadCloud className="size-10 text-slate-700" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-700">
          ลากและวางไฟล์ PDF ที่นี่ หรือคลิกเพื่อเลือกไฟล์
        </p>
        <p className="text-xs text-slate-500">รองรับเฉพาะไฟล์รูปแบบ pdf (ขนาดสูงสุด 10MB)</p>
        <input
          accept="application/pdf"
          aria-label="ไฟล์สาระการเรียนรู้"
          className="sr-only"
          disabled={disabled}
          onChange={handleInputChange}
          ref={inputRef}
          type="file"
        />
      </div>

      {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
    </div>
  );
}
