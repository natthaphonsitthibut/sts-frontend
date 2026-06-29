import type { CSSProperties } from "react";
import { getLeafMenuItems, MENU_ITEMS } from "../../auth/lib/permissions";
import type { ManagedUser } from "../types/admin.types";

export const USER_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "ใช้งาน" },
  { value: "INACTIVE", label: "ปิดการใช้งาน" },
] as const;

const ACTION_PERMISSIONS = [
  { id: "close-case", label: "ปิดเคสช่วยเหลือ" },
  { id: "forward-case", label: "ส่งต่อเคสช่วยเหลือ" },
] as const;

/** Assignable permissions (leaf menu ids + their labels). */
export function getAssignablePermissions(): Array<{ id: string; label: string }> {
  return [
    ...getLeafMenuItems(MENU_ITEMS).map((item) => ({
      id: item.id,
      label: item.label,
    })),
    ...ACTION_PERMISSIONS,
  ];
}

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
