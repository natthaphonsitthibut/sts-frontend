import type { ConfirmOptions } from "../../../components/base";

interface AttendanceSaveConfirmCounts {
  present: number;
  late: number;
  leave: number;
  absent: number;
}

const ATTENDANCE_SAVE_CONFIRM_TEXT = {
  title: "ยืนยันการส่งเช็กชื่อ",
  confirmText: "ส่งเช็กชื่อ",
  cancelText: "กลับไปตรวจ",
} as const;

export function getAttendanceSaveConfirm(
  counts: AttendanceSaveConfirmCounts,
): ConfirmOptions {
  return {
    ...ATTENDANCE_SAVE_CONFIRM_TEXT,
    description: `มา ${counts.present} คน · สาย ${counts.late} คน · ลา ${counts.leave} คน · ขาด ${counts.absent} คน — ส่งแล้วต้องเปิดแก้ไขพร้อมเหตุผลจึงจะแก้ได้`,
  };
}
