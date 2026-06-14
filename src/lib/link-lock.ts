import type { ConfirmOptions } from "../components/base";

/**
 * One source of truth for "is this link closed by an admin?". Robust to however
 * the API serialises the flag (number `1`, string `"1"`, boolean `true`) so the
 * status badge never wrongly reads a closed link as active. Shared by login and
 * attendance/visit links so the detection never drifts between features.
 */
export function isLinkLocked(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

/**
 * One source of truth for the open/close-link confirmation, shared by every
 * dashboard that toggles a link (attendance links, login links, …) so the
 * wording, button text and styling never drift between pages.
 *
 * @param locked the link's *current* locked state — the action offered is the
 * opposite (locked → "เปิด", unlocked → "ปิด").
 */
export function getLinkLockConfirm(locked: boolean): ConfirmOptions {
  return locked
    ? {
        title: "เปิดลิงก์",
        description: "ต้องการเปิดลิงก์นี้อีกครั้งใช่หรือไม่?",
        confirmText: "เปิด",
        variant: "default",
      }
    : {
        title: "ปิดลิงก์",
        description: "ต้องการปิดลิงก์นี้ใช่หรือไม่?",
        confirmText: "ปิด",
        variant: "destructive",
      };
}
