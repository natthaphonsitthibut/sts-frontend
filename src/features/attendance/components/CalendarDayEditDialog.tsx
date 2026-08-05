import { useState } from "react";
import { Save, WandSparkles } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
} from "../../../components/base";
import { getApiErrorMessage } from "../../../lib/api-error";
import { formatThaiDate } from "../../../lib/date-time";
import type { CalendarDayType, SchoolCalendarDay } from "../types/attendance.types";

interface CalendarDayEditDialogProps {
  open: boolean;
  onClose: () => void;
  date: string;
  day: SchoolCalendarDay | null;
  error: unknown;
  isPending: boolean;
  onSave: (input: { dayType: CalendarDayType; reason: string }) => void;
  onGenerateCalendar: () => void;
  isGenerating: boolean;
}

/** Editable body, keyed by `date` in the parent so it remounts (state resets) per row instead of syncing via an effect. */
function CalendarDayEditBody({
  day,
  error,
  isGenerating,
  isPending,
  onClose,
  onGenerateCalendar,
  onSave,
}: Omit<CalendarDayEditDialogProps, "date" | "open">) {
  const [dayType, setDayType] = useState<CalendarDayType>(day?.dayType ?? "SCHOOL_DAY");
  const [reason, setReason] = useState(day?.reason ?? "");

  return (
    <>
      <DialogBody className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>บันทึกไม่สำเร็จ</AlertTitle>
            <AlertDescription>{getApiErrorMessage(error, "กรุณาลองอีกครั้ง")}</AlertDescription>
          </Alert>
        ) : null}

        {!day ? (
          <Alert variant="warning">
            <AlertTitle>ยังไม่มีวันนี้ในปฏิทิน</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>กด “สร้างปฏิทิน จ.-ศ.” เพื่อสร้างวันในปฏิทินทั้งภาคเรียนก่อน แล้วค่อยกลับมาแก้วันนี้อีกครั้ง</p>
              <Button
                icon={WandSparkles}
                isLoading={isGenerating}
                onClick={onGenerateCalendar}
                size="sm"
                variant="outline"
              >
                สร้างปฏิทิน จ.-ศ.
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">ปัจจุบัน: {day.dayType === "SCHOOL_DAY" ? "วันเรียน" : day.dayType === "HOLIDAY" ? "วันหยุด" : "ยกเลิกการเรียน"}</Badge>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calendar-day-type">ประเภทวัน</Label>
              <Select
                id="calendar-day-type"
                onChange={(event) => setDayType(event.target.value as CalendarDayType)}
                value={dayType}
              >
                <option value="SCHOOL_DAY">วันเรียน</option>
                <option value="HOLIDAY">วันหยุด</option>
                <option value="CANCELLED">ยกเลิกการเรียน</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calendar-day-reason">เหตุผล</Label>
              <Input
                id="calendar-day-reason"
                onChange={(event) => setReason(event.target.value)}
                placeholder="เช่น วันหยุดราชการ หรือประกาศปิดเรียน"
                value={reason}
              />
            </div>
          </>
        )}
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose} type="button" variant="outline">
          ปิด
        </Button>
        {day ? (
          <Button
            icon={Save}
            isLoading={isPending}
            onClick={() => onSave({ dayType, reason: reason.trim() })}
          >
            บันทึกวัน
          </Button>
        ) : null}
      </DialogFooter>
    </>
  );
}

export function CalendarDayEditDialog({
  date,
  day,
  error,
  isGenerating,
  isPending,
  onClose,
  onGenerateCalendar,
  onSave,
  open,
}: CalendarDayEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>แก้ปฏิทินวันที่ {formatThaiDate(date)}</DialogTitle>
          {!day ? (
            <DialogDescription>วันนี้ยังไม่มีข้อมูลในปฏิทินภาคเรียน</DialogDescription>
          ) : null}
        </DialogHeader>
        {open ? (
          <CalendarDayEditBody
            key={date}
            day={day}
            error={error}
            isGenerating={isGenerating}
            isPending={isPending}
            onClose={onClose}
            onGenerateCalendar={onGenerateCalendar}
            onSave={onSave}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
