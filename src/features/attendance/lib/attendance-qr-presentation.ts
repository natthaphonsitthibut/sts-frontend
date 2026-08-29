/** Fields that a school may choose to encode in its student QR cards. */
export type AttendanceQrScanSource = "studentNumber" | "studentName";
export type AttendanceQrRecordStatus = "P_PRESENT" | "P_LATE";

/**
 * A QR means the student is physically with the teacher. Leave and absence
 * remain teacher-recorded exceptions in the roster, never scanner choices.
 */
export const ATTENDANCE_QR_RECORD_STATUSES: readonly AttendanceQrRecordStatus[] =
  ["P_PRESENT", "P_LATE"];

export interface AttendanceQrScanCandidate {
  name: string;
  studentNumber?: string | null;
}

export const ATTENDANCE_QR_SCAN_SOURCES: readonly {
  value: AttendanceQrScanSource;
  label: string;
}[] = [
  {
    value: "studentNumber",
    label: "รหัสประจำตัวนักเรียน",
  },
  {
    value: "studentName",
    label: "ชื่อ-นามสกุล",
  },
];

export function getAttendanceQrCandidateValue(
  candidate: AttendanceQrScanCandidate,
  source: AttendanceQrScanSource,
): string {
  return source === "studentNumber"
    ? (candidate.studentNumber ?? "")
    : candidate.name;
}
