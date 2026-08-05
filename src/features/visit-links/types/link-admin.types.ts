export type LinkAdminAction = "lock" | "unlock";

/**
 * Admin lock/unlock contract of `/task-links/:id/admin-lock`. It used to live in
 * the retired ลิงก์เข้าใช้งาน feature; VISIT links are the only surface that still
 * locks a task link, so the contract lives with them now.
 */
export interface LinkAdminPayload {
  action: LinkAdminAction;
  reason: string;
}

export interface LinkAdminResponse {
  message: string;
  link_id: string;
  admin_locked: number | boolean;
}
