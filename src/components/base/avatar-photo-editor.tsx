import { useRef, useState, type ChangeEvent } from "react";
import { Camera, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { PhotoCropDialog } from "./photo-crop-dialog";

export interface AvatarPhotoEditorProps {
  /** Display name — drives the deterministic gradient and the fallback letter. */
  name: string;
  /** Already-resolved photo URL; the letter fallback shows without one. */
  photoUrl?: string | null;
  /** Describes the subject, e.g. "รูปประจำตัวนักเรียน" — used in labels and alt text. */
  label: string;
  /** Without this the avatar is display-only (no click target, no buttons). */
  editable?: boolean;
  isSubmitting?: boolean;
  onSelect: (file: File) => void;
  onRemove?: () => void;
  /** Size classes for the circle; defaults to the profile-header size. */
  avatarClassName?: string;
  className?: string;
}

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/gif,image/webp";

/**
 * Round profile avatar that doubles as its own upload control: the picture is
 * the click target (with a camera badge to say so) and a focusable button, so
 * it covers keyboard users too; the one button underneath removes the photo. A picked file goes through
 * {@link PhotoCropDialog} first, so storage only ever receives a square.
 *
 * Unlike {@link PhotoPicker} — which holds a pending selection for a form to
 * submit — this one saves immediately, for screens where the photo is the whole
 * edit rather than one field of a form.
 */
export function AvatarPhotoEditor({
  avatarClassName,
  className,
  editable = false,
  isSubmitting = false,
  label,
  name,
  onRemove,
  onSelect,
  photoUrl,
}: AvatarPhotoEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const selected = event.target.files?.[0] ?? null;
    // Reset so picking the same file twice still opens the cropper.
    event.target.value = "";
    if (selected) setPendingCropFile(selected);
  }

  function openFilePicker(): void {
    if (!editable || isSubmitting) return;
    inputRef.current?.click();
  }

  // Always a circle, the same size on every page (owner, 2026-09-25: "เป็น
  // วงกลมเหมือนกันทุกจุด") — PhotoPicker's form frame matches it.
  const avatar = (
    <Avatar
      className={cn("size-28 text-3xl sm:size-32 sm:text-4xl", avatarClassName)}
      fallback={name.charAt(0).toUpperCase() || "?"}
      gradientName={name}
      imageAlt={label}
      imageUrl={photoUrl ?? null}
    />
  );

  if (!editable) {
    return (
      <div className={cn("flex flex-col items-center gap-3", className)}>
        {avatar}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <button
        aria-label={photoUrl ? `เปลี่ยน${label}` : `เพิ่ม${label}`}
        className="group relative w-auto rounded-full transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        onClick={openFilePicker}
        type="button"
      >
        {avatar}
        <span
          aria-hidden="true"
          className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full border-2 border-white bg-slate-950 text-white transition-colors group-hover:bg-slate-800"
        >
          <Camera className="size-4" />
        </span>
      </button>

      <input
        accept={ACCEPTED_IMAGE_TYPES}
        className="sr-only"
        disabled={isSubmitting}
        onChange={handleFileChange}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />

      {/* No separate เพิ่มรูป/เปลี่ยนรูป button: the picture is already that
          button, camera badge and keyboard focus included (owner, 2026-09-25). */}
      {photoUrl && onRemove ? (
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            disabled={isSubmitting}
            icon={Trash2}
            onClick={onRemove}
            size="sm"
            type="button"
            variant="outline"
          >
            นำรูปออก
          </Button>
        </div>
      ) : null}

      <PhotoCropDialog
        file={pendingCropFile}
        onCancel={() => setPendingCropFile(null)}
        onConfirm={(cropped) => {
          setPendingCropFile(null);
          onSelect(cropped);
        }}
        title={`จัด${label}`}
      />
    </div>
  );
}
