import type {
  FieldFollower,
  FieldFollowerReviewAction,
  FieldFollowerStatus,
} from "../types/field-follower.types";

export type FieldFollowerBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "success"
  | "warning";

interface FieldFollowerStatusMeta {
  label: string;
  variant: FieldFollowerBadgeVariant;
}

const STATUS_META: Record<FieldFollowerStatus, FieldFollowerStatusMeta> = {
  APPLIED: { label: "รอตรวจสอบ", variant: "warning" },
  VERIFIED: { label: "ยืนยันตัวตนแล้ว", variant: "secondary" },
  ACTIVE: { label: "ใช้งานได้", variant: "success" },
  SUSPENDED: { label: "ระงับ/ปฏิเสธ", variant: "destructive" },
};

export function getFieldFollowerStatusMeta(status: FieldFollowerStatus): FieldFollowerStatusMeta {
  return STATUS_META[status];
}

const REVIEW_ACTION_LABELS: Record<FieldFollowerReviewAction, string> = {
  APPROVE: "อนุมัติ",
  REJECT: "ปฏิเสธ",
  SUSPEND: "ระงับการใช้งาน",
  REACTIVATE: "เปิดใช้งานอีกครั้ง",
};

export function getFieldFollowerReviewActionLabel(action: FieldFollowerReviewAction): string {
  return REVIEW_ACTION_LABELS[action];
}

/** Which review actions are legal from each status — must mirror REVIEW_TRANSITIONS in the backend service. */
const AVAILABLE_ACTIONS: Record<FieldFollowerStatus, FieldFollowerReviewAction[]> = {
  APPLIED: ["APPROVE", "REJECT"],
  VERIFIED: ["SUSPEND"],
  ACTIVE: ["SUSPEND"],
  SUSPENDED: ["REACTIVATE"],
};

export function getAvailableFieldFollowerActions(
  status: FieldFollowerStatus,
): FieldFollowerReviewAction[] {
  return AVAILABLE_ACTIONS[status];
}

export function getFieldFollowerFullName(follower: FieldFollower): string {
  return `${follower.first_name} ${follower.last_name}`.trim();
}

export function getFieldFollowerAreaText(follower: FieldFollower): string {
  const parts = [follower.province, follower.district, follower.sub_district].filter(
    (part): part is string => Boolean(part && part.trim()),
  );
  return parts.length > 0 ? parts.join(" · ") : "ไม่ระบุพื้นที่";
}
