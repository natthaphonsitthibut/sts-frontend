import type { CaseReferralOutcomeStatus } from "../types/cases.types";

export const AGENCY_TYPE_LABELS: Record<string, string> = {
  HOSPITAL: "โรงพยาบาล",
  POLICE: "ตำรวจ",
  SOCIAL_WELFARE: "พมจ./สังคมสงเคราะห์",
  NGO: "องค์กรช่วยเหลือ",
  EDUCATION: "หน่วยงานการศึกษา",
  OTHER: "อื่น ๆ",
};

export const CASE_REFERRAL_OUTCOME_OPTIONS: Array<{
  value: CaseReferralOutcomeStatus;
  label: string;
}> = [
  { value: "ACKNOWLEDGED", label: "รับเรื่องแล้ว" },
  { value: "ACCEPTED", label: "รับดำเนินการ" },
  { value: "DECLINED", label: "ปฏิเสธ" },
  { value: "RETURNED", label: "ส่งกลับ" },
];

export const REFERRAL_STATUS_LABELS: Record<string, string> = {
  SENT: "ส่งต่อแล้ว",
  ACKNOWLEDGED: "รับเรื่องแล้ว",
  ACCEPTED: "รับดำเนินการ",
  DECLINED: "ปฏิเสธ",
  RETURNED: "ส่งกลับ",
};

export function getAgencyTypeLabel(value?: string | null): string {
  return value ? (AGENCY_TYPE_LABELS[value] ?? value) : "-";
}

export function getReferralStatusLabel(value?: string | null): string {
  return value ? (REFERRAL_STATUS_LABELS[value] ?? value) : "-";
}

export function canUpdateReferralOutcome(status?: string | null): boolean {
  return status === "SENT" || status === "ACKNOWLEDGED";
}
