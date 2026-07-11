import type { BadgeProps } from "../../../components/base";
import { findStatusCatalogItem } from "../../status-catalog/hooks/useStatusCatalog";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";
import type {
  FieldFollower,
  FieldFollowerReviewAction,
  FieldFollowerStatus,
} from "../types/field-follower.types";

interface FieldFollowerStatusMeta {
  label: string;
  variant: BadgeProps["variant"];
}

export function getFieldFollowerStatusMeta(
  catalog: readonly StatusCatalogItem[],
  status: FieldFollowerStatus,
): FieldFollowerStatusMeta {
  const item = findStatusCatalogItem(catalog, status);
  return {
    label: item?.label ?? "ไม่ระบุสถานะ",
    variant: item?.badgeVariant ?? "secondary",
  };
}

const REVIEW_ACTION_LABELS: Record<FieldFollowerReviewAction, string> = {
  VERIFY: "ยืนยันตัวตน",
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
  APPLIED: ["VERIFY", "REJECT"],
  VERIFIED: ["APPROVE", "SUSPEND"],
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
