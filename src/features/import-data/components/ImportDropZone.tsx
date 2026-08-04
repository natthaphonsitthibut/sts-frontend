import { useRef, useState } from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import { cn } from "../../../lib/utils";
import { IconButton } from "../../../components/base";

interface ImportDropZoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

const ACCEPTED = ".xlsx,.csv";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImportDropZone({
  file,
  onFileSelect,
  disabled,
}: ImportDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  if (file) {
    return (
      <div className="flex h-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success-100 text-success-700">
          <FileSpreadsheet className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold text-slate-800">{file.name}</div>
          <div className="text-xs text-slate-500">{formatBytes(file.size)}</div>
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
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed bg-white px-6 py-4 text-center transition-colors",
        dragOver
          ? "border-primary bg-surface-sky"
          : "border-slate-300 hover:border-primary",
        disabled && "cursor-not-allowed opacity-60",
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
      <Upload className="size-6 text-primary" aria-hidden="true" />
      <div className="text-sm font-bold text-slate-700">
        ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์
      </div>
      <div className="text-xs text-slate-500">รองรับไฟล์ .xlsx, .csv</div>
      <input
        accept={ACCEPTED}
        className="hidden"
        onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
        ref={inputRef}
        type="file"
      />
    </button>
  );
}
