import { useRef, useState, type DragEvent } from "react";
import { File, FileImage, UploadCloud, X } from "lucide-react";
import { IconButton } from "../../../components/base";
import { cn } from "../../../lib/utils";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

interface VisitPhotoUploadProps {
  className?: string;
  dropzoneClassName?: string;
  files: File[];
  onChange: (files: File[]) => void;
}

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function VisitPhotoUpload({
  className,
  dropzoneClassName,
  files,
  onChange,
}: VisitPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  function addFiles(nextFiles: File[]): void {
    const invalidType = nextFiles.find((file) => !ACCEPTED_TYPES.has(file.type));
    if (invalidType) {
      setError("รองรับเฉพาะไฟล์ JPG, PNG, GIF, WEBP, PDF, DOC และ DOCX");
      return;
    }
    const oversized = nextFiles.find((file) => file.size > MAX_FILE_BYTES);
    if (oversized) {
      setError(`ไฟล์ ${oversized.name} มีขนาดเกิน 5MB`);
      return;
    }

    const unique = new Map(files.map((file) => [fileKey(file), file]));
    nextFiles.forEach((file) => unique.set(fileKey(file), file));
    const merged = Array.from(unique.values()).slice(0, MAX_FILES);
    setError(unique.size > MAX_FILES ? "แนบไฟล์ได้สูงสุด 5 ไฟล์" : "");
    onChange(merged);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  const atFileLimit = files.length >= MAX_FILES;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <input
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx"
        className="sr-only"
        multiple
        onChange={(event) => {
          addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
        ref={inputRef}
        type="file"
      />
      <div
        data-visit-upload-dropzone
        className={cn(
          "flex min-h-52 flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary bg-brand-active px-4 py-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          atFileLimit ? "cursor-not-allowed opacity-70" : "cursor-pointer",
          dragging && "border-primary bg-primary-soft",
          dropzoneClassName,
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        onClick={() => {
          if (!atFileLimit) inputRef.current?.click();
        }}
        onKeyDown={(event) => {
          if (!atFileLimit && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        aria-disabled={atFileLimit}
        tabIndex={0}
      >
        <UploadCloud className="size-16 text-slate-900" aria-hidden="true" />
        <p className="mt-2 text-sm font-semibold text-slate-800">
          ลากและวางไฟล์ที่นี่ หรือคลิกเพื่อเลือกไฟล์
        </p>
        <p className="mt-1 text-xs text-slate-600">
          รองรับ JPG, PNG, GIF, WEBP, PDF, DOC และ DOCX สูงสุด 5MB ต่อไฟล์
        </p>
      </div>

      {error ? (
        <p className="text-sm font-medium text-danger-700" role="alert">
          {error}
        </p>
      ) : null}

      {files.length > 0 ? (
        <ul className="space-y-2" aria-label="ไฟล์แนบที่เลือก">
          {files.map((file) => (
            <li
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
              key={fileKey(file)}
            >
              {file.type.startsWith("image/") ? (
                <FileImage className="size-5 shrink-0 text-primary" aria-hidden="true" />
              ) : (
                <File className="size-5 shrink-0 text-primary" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
              <IconButton
                aria-label={`ลบไฟล์ ${file.name}`}
                icon={X}
                onClick={() => onChange(files.filter((item) => fileKey(item) !== fileKey(file)))}
                size="sm"
                variant="delete"
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
