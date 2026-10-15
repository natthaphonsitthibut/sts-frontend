import { useState } from "react";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  RadioCardGroup,
} from "../../../components/base";

export type WatchDecision = "OPEN_CASE" | "CLOSE_WATCH";

const WATCH_DECISION_OPTIONS = [
  { value: "OPEN_CASE", label: "เปิดเคสติดตาม" },
  { value: "CLOSE_WATCH", label: "ปิดการเฝ้าระวัง" },
] as const;

interface WatchDecisionDialogProps {
  open: boolean;
  studentName: string;
  onOpenChange: (open: boolean) => void;
  onDecide: (decision: WatchDecision) => void;
}

/**
 * The one พิจารณา step of a เฝ้าระวัง row: pick เปิดเคส or ปิดการเฝ้าระวัง, then
 * the caller opens that decision's own dialog (owner, 2026-10-15).
 */
export function WatchDecisionDialog({
  onDecide,
  onOpenChange,
  open,
  studentName,
}: WatchDecisionDialogProps) {
  const [decision, setDecision] = useState<WatchDecision | null>(null);

  // Cleared on every close, so the next row starts with no choice made.
  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) setDecision(null);
    onOpenChange(nextOpen);
  }

  function handleNext(): void {
    if (!decision) return;
    setDecision(null);
    onDecide(decision);
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        aria-labelledby="watch-decision-title"
        className="w-[min(92vw,520px)] text-left"
        onClose={() => handleOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle id="watch-decision-title">
            พิจารณานักเรียนเฝ้าระวัง
          </DialogTitle>
          <DialogDescription>
            {studentName} · เลือกว่าจะเปิดเคสติดตาม
            หรือให้นักเรียนกลับเป็นสถานะปกติ
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <RadioCardGroup
            legend="ผลการพิจารณา"
            name="watch-decision"
            onChange={setDecision}
            options={WATCH_DECISION_OPTIONS}
            value={decision}
          />
        </DialogBody>
        <DialogFooter>
          <Button
            onClick={() => handleOpenChange(false)}
            type="button"
            variant="outline"
          >
            ยกเลิก
          </Button>
          <Button disabled={!decision} onClick={handleNext} type="button">
            ถัดไป
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
