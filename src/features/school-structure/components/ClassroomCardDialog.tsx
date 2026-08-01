import { Crop, ImagePlus, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  buttonVariants,
} from "../../../components/base";
import { getApiErrorMessage } from "../../../lib/api-error";
import { cn } from "../../../lib/utils";
import { useUpdateClassroomPresentation } from "../hooks/useSchoolStructure";
import type { SchoolClassroom } from "../types/school-structure.types";
import {
  classroomCoverImageStyle,
  classroomCoverStyle,
  resolveClassroomCoverUrl,
} from "../lib/classroom-card-presentation";

interface ClassroomCardDialogProps {
  classroom: SchoolClassroom;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

function CropRange({
  label,
  max,
  min,
  onChange,
  step = 1,
  value,
  valueLabel,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
  valueLabel?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      <span className="flex items-center justify-between gap-3">
        {label}
        <span className="tabular-nums text-slate-500">{valueLabel ?? `${value}%`}</span>
      </span>
      <input
        className="h-2 w-full cursor-pointer accent-primary"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </label>
  );
}

export function ClassroomCardDialog({
  classroom,
  onOpenChange,
  open,
}: ClassroomCardDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [positionX, setPositionX] = useState(classroom.coverImagePositionX);
  const [positionY, setPositionY] = useState(classroom.coverImagePositionY);
  const [scale, setScale] = useState(classroom.coverImageScale);
  const dragState = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startPositionX: number;
    startPositionY: number;
  } | null>(null);
  const updatePresentation = useUpdateClassroomPresentation();

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  const classroomLabel = `${classroom.gradeLabel}/${classroom.roomCode}`;
  const storedCoverUrl = resolveClassroomCoverUrl(classroom.coverImageUrl);
  const previewUrl = removeCover ? null : (localPreviewUrl ?? storedCoverUrl);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!selected) return;
    setFile(selected);
    setLocalPreviewUrl(URL.createObjectURL(selected));
    setRemoveCover(false);
    setPositionX(50);
    setPositionY(50);
    setScale(1);
  }

  function handleSave(): void {
    updatePresentation.mutate(
      {
        classroomId: classroom.id,
        cardCoverColor: classroom.cardCoverColor,
        coverImagePositionX: positionX,
        coverImagePositionY: positionY,
        coverImageScale: scale,
        file: file ?? undefined,
        removeCover,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (!previewUrl) return;
    dragState.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPositionX: positionX,
      startPositionY: positionY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>): void {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nextX = drag.startPositionX - ((event.clientX - drag.startClientX) / rect.width) * 100;
    const nextY = drag.startPositionY - ((event.clientY - drag.startClientY) / rect.height) * 100;
    setPositionX(Math.round(Math.min(100, Math.max(0, nextX))));
    setPositionY(Math.round(Math.min(100, Math.max(0, nextY))));
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>): void {
    if (dragState.current?.pointerId !== event.pointerId) return;
    dragState.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-xl" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle icon={Crop}>จัดรูปปกห้อง {classroomLabel}</DialogTitle>
          <DialogDescription>
            เลือกรูปและจัดตำแหน่งในกรอบ ตัวเลือกจะยังไม่ถูกบันทึกจนกดบันทึก
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "relative flex aspect-[16/7] touch-none select-none items-center justify-center overflow-hidden rounded-lg border border-slate-200",
            previewUrl && "cursor-grab active:cursor-grabbing",
          )}
          onPointerCancel={handlePointerEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          style={classroomCoverStyle(classroom.cardCoverColor)}
        >
          {previewUrl ? (
            <img
              alt="ตัวอย่างรูปปกห้องเรียน"
              className="pointer-events-none size-full select-none object-cover"
              draggable={false}
              src={previewUrl}
              style={classroomCoverImageStyle({ positionX, positionY, scale })}
            />
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <label
            className={cn(
              buttonVariants({ variant: "outline", size: "md" }),
              updatePresentation.isPending && "pointer-events-none opacity-50",
            )}
          >
            <Upload className="size-4" aria-hidden="true" />
            {previewUrl ? "เปลี่ยนรูป" : "เลือกรูป"}
            <input
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="sr-only"
              disabled={updatePresentation.isPending}
              onChange={handleFileChange}
              type="file"
            />
          </label>
          {previewUrl ? (
            <Button
              disabled={updatePresentation.isPending}
              icon={Trash2}
              onClick={() => {
                setFile(null);
                setLocalPreviewUrl(null);
                setRemoveCover(true);
                setPositionX(50);
                setPositionY(50);
                setScale(1);
              }}
              variant="outline"
            >
              นำรูปออก
            </Button>
          ) : null}
        </div>

        {previewUrl ? (
          <div className="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <CropRange label="แนวนอน" max={100} min={0} onChange={setPositionX} value={positionX} />
            <CropRange label="แนวตั้ง" max={100} min={0} onChange={setPositionY} value={positionY} />
            <div className="sm:col-span-2">
              <CropRange
                label="ซูม"
                max={3}
                min={1}
                onChange={setScale}
                step={0.05}
                value={scale}
                valueLabel={`${Math.round(scale * 100)}%`}
              />
            </div>
          </div>
        ) : (
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-slate-500">
            <ImagePlus className="size-4" aria-hidden="true" />
            รองรับ JPG, PNG, GIF และ WebP ขนาดไม่เกิน 5 MB
          </p>
        )}

        {updatePresentation.error ? (
          <Alert className="mt-4" variant="destructive">
            <AlertDescription>
              {getApiErrorMessage(updatePresentation.error, "บันทึกรูปปกห้องเรียนไม่สำเร็จ")}
            </AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button
            disabled={updatePresentation.isPending}
            onClick={() => onOpenChange(false)}
            variant="secondary"
          >
            ยกเลิก
          </Button>
          <Button
            disabled={updatePresentation.isPending}
            isLoading={updatePresentation.isPending}
            onClick={handleSave}
          >
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
