import { Eraser, WandSparkles } from "lucide-react";
import { Button } from "../../../components/base";
import { cn } from "../../../lib/utils";

// Presentation shortcut — temporary; see lib/presentation-fill.ts.
export function PresentationFillBar({
  className,
  onClear,
  onFill,
}: {
  className?: string;
  onClear: () => void;
  onFill: () => void;
}) {
  return (
    <div
      className={cn("flex flex-wrap justify-end gap-2", className)}
      data-presentation-fill
    >
      <Button onClick={onFill} size="sm" type="button" variant="outline">
        <WandSparkles aria-hidden className="size-4" />
        กรอกอัตโนมัติ
      </Button>
      <Button onClick={onClear} size="sm" type="button" variant="outline">
        <Eraser aria-hidden className="size-4" />
        ล้างทั้งหมด
      </Button>
    </div>
  );
}
