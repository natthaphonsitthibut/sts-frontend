import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Crop } from "lucide-react";
import { Button } from "./button";
import { CropRange } from "./crop-range";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";

/** Square edge of the exported image — plenty for a 96px avatar on a 2x display. */
const OUTPUT_SIZE = 512;
const MAX_SCALE = 3;

export interface PhotoCropDialogProps {
  /** File the user just picked; the dialog opens when this is set. */
  file: File | null;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
  title?: string;
}

/**
 * Pan-and-zoom framing for a profile photo, mirroring the classroom cover
 * controls.
 *
 * The chosen framing is baked into a square image before upload rather than
 * stored as position/scale columns, so every place that renders the avatar —
 * tables, headers, dialogs — gets the right crop without carrying framing
 * metadata around.
 */
export function PhotoCropDialog({
  file,
  onCancel,
  onConfirm,
  title = "จัดรูปประจำตัว",
}: PhotoCropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragState = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startPositionX: number;
    startPositionY: number;
  } | null>(null);

  const [positionX, setPositionX] = useState(50);
  const [positionY, setPositionY] = useState(50);
  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);

  // Reset framing when a different file arrives. Done during render (React's
  // recommended pattern) rather than in the effect, which would cascade renders.
  const [trackedFile, setTrackedFile] = useState(file);
  if (file !== trackedFile) {
    setTrackedFile(file);
    setPositionX(50);
    setPositionY(50);
    setScale(1);
    setReady(false);
  }

  // Load the picked file into an <img> the canvas can draw from.
  useEffect(() => {
    if (!file) {
      imageRef.current = null;
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setReady(true);
    };
    image.src = objectUrl;
    return () => {
      URL.revokeObjectURL(objectUrl);
      imageRef.current = null;
    };
  }, [file]);

  /**
   * Source rectangle for the current framing, using the same rules as CSS
   * `object-fit: cover` + `object-position`, so the preview and the exported
   * file always agree.
   */
  const getSourceRect = useCallback(
    (image: HTMLImageElement) => {
      const cover = Math.max(
        OUTPUT_SIZE / image.naturalWidth,
        OUTPUT_SIZE / image.naturalHeight,
      );
      const effective = cover * scale;
      const width = Math.min(image.naturalWidth, OUTPUT_SIZE / effective);
      const height = Math.min(image.naturalHeight, OUTPUT_SIZE / effective);
      return {
        sx: (image.naturalWidth - width) * (positionX / 100),
        sy: (image.naturalHeight - height) * (positionY / 100),
        width,
        height,
      };
    },
    [positionX, positionY, scale],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !ready) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const { sx, sy, width, height } = getSourceRect(image);
    context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.drawImage(image, sx, sy, width, height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  }, [getSourceRect, ready]);

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>): void {
    if (!ready) return;
    dragState.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPositionX: positionX,
      startPositionY: positionY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>): void {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nextX =
      drag.startPositionX - ((event.clientX - drag.startClientX) / rect.width) * 100;
    const nextY =
      drag.startPositionY - ((event.clientY - drag.startClientY) / rect.height) * 100;
    setPositionX(Math.round(Math.min(100, Math.max(0, nextX))));
    setPositionY(Math.round(Math.min(100, Math.max(0, nextY))));
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLCanvasElement>): void {
    if (dragState.current?.pointerId !== event.pointerId) return;
    dragState.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleConfirm(): void {
    const canvas = canvasRef.current;
    if (!canvas || !file) return;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const name = file.name.replace(/\.[^.]+$/, "") || "photo";
        onConfirm(new File([blob], `${name}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <Dialog onOpenChange={(next) => (next ? undefined : onCancel())} open={Boolean(file)}>
      <DialogContent className="max-w-md" onClose={onCancel}>
        <DialogHeader>
          <DialogTitle icon={Crop}>{title}</DialogTitle>
          <DialogDescription>
            ลากเพื่อเลื่อนตำแหน่ง และปรับซูมให้ได้กรอบที่ต้องการ
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <canvas
            aria-label="ตัวอย่างรูปประจำตัว"
            className="aspect-square w-full max-w-[280px] cursor-grab touch-none select-none rounded-2xl border border-slate-200 bg-slate-100 active:cursor-grabbing"
            height={OUTPUT_SIZE}
            onPointerCancel={handlePointerEnd}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            ref={canvasRef}
            width={OUTPUT_SIZE}
          />
        </div>

        <div className="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <CropRange
            disabled={!ready}
            label="แนวนอน"
            max={100}
            min={0}
            onChange={setPositionX}
            value={positionX}
          />
          <CropRange
            disabled={!ready}
            label="แนวตั้ง"
            max={100}
            min={0}
            onChange={setPositionY}
            value={positionY}
          />
          <CropRange
            disabled={!ready}
            label="ซูม"
            max={MAX_SCALE}
            min={1}
            onChange={setScale}
            step={0.05}
            value={scale}
            valueLabel={`${Math.round(scale * 100)}%`}
          />
        </div>

        <DialogFooter>
          <Button onClick={onCancel} type="button" variant="outline">
            ยกเลิก
          </Button>
          <Button disabled={!ready} onClick={handleConfirm} type="button">
            ใช้รูปนี้
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
