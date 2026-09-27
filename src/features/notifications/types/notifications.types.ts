export type NotificationReadStatus = "all" | "unread" | "read";

export interface NotificationItem {
  id: string;
  type_code: string;
  type_label?: string | null;
  title: string;
  body?: string | null;
  student_person_uuid: string | null;
  case_id: number | null;
  /** Set on a case notification only. */
  case_status_code: string | null;
  student_name_snapshot: string | null;
  reason_text: string | null;
  ref_entity?: string | null;
  ref_id?: string | null;
  seen_at?: string | null;
  read_at?: string | null;
  created_at: string;
  /** The student's current enrollment, for the profile link. */
  student_uuid?: string | null;
  /** A watchlist alert's comment level (WATCH / CONCERN). */
  concern_level_code?: string | null;
}

export interface NotificationListResponse {
  rows: NotificationItem[];
  totalCount: number;
  page: number;
  limit: number;
  unreadCount: number;
  unseenCount: number;
}
