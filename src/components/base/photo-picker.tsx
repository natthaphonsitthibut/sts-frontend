import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { PhotoCropDialog } from "./photo-crop-dialog";
import type { PhotoPickerValue } from "./photo-picker-value";

export interface PhotoPickerProps {
  /** App-served URL of the stored photo, already resolved for the API base. */
  storedUrl?: string | null;
  value: PhotoPickerValue;
  onChange: (value: PhotoPickerValue) => void;
  disabled?: boolean;
  /** Describes the subject, e.g. "รูปประจำตัวคุณครู" — used for alt text and labels. */
  label: string;
  className?: string;
}

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/gif,image/webp";

/**
 * Square profile-photo field used by every "เพิ่ม/แก้ไข" form that carries a
 * picture. Holds only the pending selection — the caller uploads it as part of
 * its own save mutation, so a half-finished form never writes to storage.
 *
 * A picked file goes through {@link PhotoCropDialog} first, so what lands in
 * storage is already framed as a square and every avatar in the app renders it
 * the same way.
 */
export function PhotoPicker({
  storedUrl,
  value,
  onChange,
  disabled,
  label,
  className,
}: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  const previewUrl = value.removed ? null : (localPreviewUrl ?? storedUrl ?? null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const selected = event.target.files?.[0] ?? null;
    // Reset so picking the same file twice still opens the cropper.
    event.target.value = "";
    if (!selected) return;
    setPendingCropFile(selected);
  }

  function handleCropConfirm(cropped: File): void {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(URL.createObjectURL(cropped));
    setPendingCropFile(null);
    onChange({ file: cropped, removed: false });
  }

  function handleClear(): void {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(null);
    onChange({ file: null, removed: true });
  }

  function openFilePicker(): void {
    if (disabled) return;
    inputRef.current?.click();
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* The frame itself is the primary target — the button below stays for
          discoverability and keyboard users who expect a labelled control. */}
      <button
        aria-label={previewUrl ? `เปลี่ยน${label}` : `เลือก${label}`}
        className={cn(
          "flex aspect-square w-full max-w-[280px] items-center justify-center overflow-hidden rounded-2xl bg-slate-200 transition-colors",
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        )}
        disabled={disabled}
        onClick={openFilePicker}
        type="button"
      >
        {previewUrl ? (
          <img alt={label} className="size-full object-cover" src={previewUrl} />
        ) : (
          <ImagePlus className="size-20 text-slate-700" aria-hidden="true" />
        )}
      </button>

      <input
        accept={ACCEPTED_IMAGE_TYPES}
        className="sr-only"
        disabled={disabled}
        onChange={handleFileChange}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />

      <div className="flex flex-wrap justify-center gap-2">
        <Button
          disabled={disabled}
          onClick={openFilePicker}
          size="sm"
          type="button"
          variant="outline"
        >
          {previewUrl ? "เปลี่ยนรูป" : "เลือกรูป"}
        </Button>
        {previewUrl ? (
          <Button
            disabled={disabled}
            icon={Trash2}
            onClick={handleClear}
            size="sm"
            type="button"
            variant="outline"
          >
            นำรูปออก
          </Button>
        ) : null}
      </div>

      <PhotoCropDialog
        file={pendingCropFile}
        onCancel={() => setPendingCropFile(null)}
        onConfirm={handleCropConfirm}
        title={`จัด${label}`}
      />
    </div>
  );
}
