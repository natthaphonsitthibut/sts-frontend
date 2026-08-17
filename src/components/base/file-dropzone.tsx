import { useId, useRef, useState } from "react";
import { FileSpreadsheet, UploadCloud, X, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { IconButton } from "./icon-button";
import { formatFileSize } from "../../lib/file-size";

export interface FileDropzoneProps {
  /** Comma-separated extension list passed straight to the file input. */
  accept?: string;
  className?: string;
  disabled?: boolean;
  file: File | null;
  /** Icon shown on the selected-file card. */
  fileIcon?: LucideIcon;
  /** Secondary line describing what the picker accepts. */
  hint?: string;
  label?: string;
  onFileSelect: (file: File | null) => void;
  /** `default` matches a form field's height; `panel` fills a larger drop area. */
  size?: "default" | "panel";
}

/**
 * Shared drag-and-drop file picker. The drop area keeps the app's standing
 * treatment — a blue dashed border on a tinted surface, deepening while a file
 * is over it — so every upload target reads as the same affordance. Selecting a
 * file swaps the area for a card naming it.
 */
export function FileDropzone({
  accept = ".xlsx,.csv",
  className,
  disabled = false,
  file,
  fileIcon: FileIcon = FileSpreadsheet,
  hint = "รองรับไฟล์ .xlsx, .csv",
  label = "ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์",
  onFileSelect,
  size = "default",
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragOver, setDragOver] = useState(false);

  if (file) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm",
          size === "panel" ? "min-h-[152px]" : "h-full",
          className,
        )}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success-100 text-success-700">
          <FileIcon className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold text-slate-800">{file.name}</div>
          <div className="text-xs text-slate-500">{formatFileSize(file.size)}</div>
        </div>
        <IconButton
          aria-label="เอาไฟล์ออก"
          className="text-slate-500"
          disabled={disabled}
          icon={X}
          onClick={() => onFileSelect(null)}
          variant="ghost"
        />
      </div>
    );
  }

  return (
    <button
      aria-describedby={`${inputId}-hint`}
      className={cn(
        "flex w-full flex-col items-center justify-center border-2 border-dashed border-primary bg-brand-active text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        size === "panel"
          ? "min-h-52 gap-2 rounded-xl px-6 py-8"
          : "h-full gap-1 rounded-lg px-6 py-4",
        dragOver && "bg-primary-soft",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
      disabled={disabled}
      onClick={() => inputRef.current?.click()}
      onDragLeave={() => setDragOver(false)}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        if (disabled) return;
        const dropped = event.dataTransfer.files?.[0];
        if (dropped) onFileSelect(dropped);
      }}
      type="button"
    >
      <UploadCloud
        aria-hidden="true"
        className={cn("text-primary", size === "panel" ? "size-10" : "size-6")}
      />
      <div
        className={cn(
          "font-bold text-slate-700",
          size === "panel" ? "text-base" : "text-sm",
        )}
      >
        {label}
      </div>
      <div className="text-xs text-slate-500" id={`${inputId}-hint`}>
        {hint}
      </div>
      <input
        accept={accept}
        className="hidden"
        onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
        ref={inputRef}
        type="file"
      />
    </button>
  );
}
