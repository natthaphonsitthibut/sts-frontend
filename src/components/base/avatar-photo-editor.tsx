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
  /**
   * "circle" is the identity avatar used on profile headers and rosters;
   * "square" matches the photo field on the เพิ่ม/แก้ไขผู้ใช้งาน form.
   */
  shape?: "circle" | "square";
  className?: string;
}

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/gif,image/webp";

/**
 * Round profile avatar that doubles as its own upload control: the picture is
 * the click target (with a camera badge to say so) and the buttons underneath
 * cover keyboard users and removal. A picked file goes through
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
  shape = "circle",
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

  const isSquare = shape === "square";
  const avatar = (
    <Avatar
      className={cn(
        isSquare
          ? "aspect-square size-auto w-full max-w-[280px] rounded-2xl text-6xl"
          : "size-28 text-3xl sm:size-32 sm:text-4xl",
        avatarClassName,
      )}
      fallback={name.charAt(0).toUpperCase() || "?"}
      gradientName={name}
      imageAlt={label}
      imageUrl={photoUrl ?? null}
    />
  );

  if (!editable) {
    return <div className={cn("flex flex-col items-center gap-3", className)}>{avatar}</div>;
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <button
        aria-label={photoUrl ? `เปลี่ยน${label}` : `เพิ่ม${label}`}
        className={cn(
          "group relative w-full transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60",
          isSquare
            ? "max-w-[280px] rounded-2xl hover:ring-2 hover:ring-primary/30"
            : "w-auto rounded-full hover:ring-2 hover:ring-primary/30",
        )}
        disabled={isSubmitting}
        onClick={openFilePicker}
        type="button"
      >
        {avatar}
        <span
          aria-hidden="true"
          className={cn(
            "absolute flex size-8 items-center justify-center rounded-full border-2 border-white bg-slate-950 text-white transition-colors group-hover:bg-slate-800",
            isSquare ? "bottom-2 right-2" : "bottom-0 right-0",
          )}
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

      <div className="flex flex-wrap justify-center gap-2">
        <Button
          disabled={isSubmitting}
          onClick={openFilePicker}
          size="sm"
          type="button"
          variant="outline"
        >
          {photoUrl ? "เปลี่ยนรูป" : "เพิ่มรูป"}
        </Button>
        {photoUrl && onRemove ? (
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
        ) : null}
      </div>

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
