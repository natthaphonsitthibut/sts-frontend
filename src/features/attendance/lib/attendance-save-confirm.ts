import type { ConfirmOptions } from "../../../components/base";

interface AttendanceSaveConfirmCounts {
  present: number;
  late: number;
  absent: number;
}

const ATTENDANCE_SAVE_CONFIRM_TEXT = {
  title: "ยืนยันการบันทึกเช็คชื่อ",
  confirmText: "บันทึกข้อมูล",
  cancelText: "กลับไปตรวจ",
} as const;

export function getAttendanceSaveConfirm(
  counts: AttendanceSaveConfirmCounts,
): ConfirmOptions {
  return {
    ...ATTENDANCE_SAVE_CONFIRM_TEXT,
    description: `มา ${counts.present} คน · สาย ${counts.late} คน · ขาด ${counts.absent} คน กรุณาตรวจทวนก่อนบันทึก`,
  };
}
