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


