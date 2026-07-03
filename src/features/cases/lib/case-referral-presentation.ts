export const AGENCY_TYPE_LABELS: Record<string, string> = {
  HOSPITAL: "โรงพยาบาล",
  POLICE: "ตำรวจ",
  SOCIAL_WELFARE: "พมจ./สังคมสงเคราะห์",
  NGO: "องค์กรช่วยเหลือ",
  EDUCATION: "หน่วยงานการศึกษา",
  OTHER: "อื่น ๆ",
};

export function getAgencyTypeLabel(value?: string | null): string {
  return value ? (AGENCY_TYPE_LABELS[value] ?? value) : "-";
}

export function canUpdateReferralOutcome(status?: string | null): boolean {
  return status === "SENT" || status === "ACKNOWLEDGED";
}
