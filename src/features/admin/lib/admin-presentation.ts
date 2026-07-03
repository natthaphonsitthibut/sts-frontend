import type { CSSProperties } from "react";
import type {
  ManagedUser,
  StudentAccountManagementStatus,
} from "../types/admin.types";
import { findStatusCatalogItem } from "../../status-catalog/hooks/useStatusCatalog";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";

export function getUserDisplayName(user: ManagedUser): string {
  const fullName = [user.FirstName, user.LastName]
    .map((part) => part?.trim() || "")
    .join(" ")
    .trim();
  return fullName || user.fullname?.trim() || user.username || "-";
}

export function getUserInitial(user: ManagedUser): string {
  return getUserDisplayName(user).charAt(0).toUpperCase() || "?";
}

export function getUserRoleText(user: ManagedUser): string {
  if (user.labels && user.labels.length > 0) {
    return user.labels.join(", ");
  }
  return "ไม่มีตำแหน่ง";
}

interface AccountLifecycleStatusMeta {
  label: string;
  badgeVariant: StatusCatalogItem["badgeVariant"];
  summaryTone: NonNullable<StatusCatalogItem["summaryTone"]>;
}

export function getAccountLifecycleStatusMeta(
  status: StudentAccountManagementStatus,
  catalog: readonly StatusCatalogItem[] = [],
): AccountLifecycleStatusMeta {
  const item = findStatusCatalogItem(catalog, status);
  return {
    label: item?.label ?? status,
    badgeVariant: item?.badgeVariant ?? "secondary",
    summaryTone: item?.summaryTone ?? "default",
  };
}

export function getManagedUserLifecycleStatus(user: ManagedUser): StudentAccountManagementStatus {
  if (user.status !== "ACTIVE") {
    return "DISABLED";
  }
  if (user.must_change_password === true) {
    const expiresAt = user.temporary_password_expires_at
      ? new Date(user.temporary_password_expires_at)
      : null;
    if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
      return "TEMP_PASSWORD_EXPIRED";
    }
    return "PENDING_FIRST_LOGIN";
  }
  return "ACTIVE";
}

const AVATAR_COLOR_PAIRS = [
  ["#6366f1", "#8b5cf6"],
  ["#ec4899", "#f43f5e"],
  ["#14b8a6", "#06b6d4"],
  ["#f59e0b", "#f97316"],
  ["#10b981", "#22c55e"],
  ["#3b82f6", "#0ea5e9"],
  ["#8b5cf6", "#a855f7"],
  ["#ef4444", "#f97316"],
] as const;

export function getUserAvatarGradient(name: string): CSSProperties {
  if (!name) {
    return { background: "#ccc", color: "#fff" };
  }
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }
  const pair =
    AVATAR_COLOR_PAIRS[Math.abs(hash) % AVATAR_COLOR_PAIRS.length] ??
    AVATAR_COLOR_PAIRS[0];
  return {
    background: `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`,
    color: "white",
    textShadow: "0 1px 2px rgba(0,0,0,0.2)",
  };
}
