export type NotificationReadStatus = "all" | "unread" | "read";

export interface NotificationItem {
  id: string;
  type_code: string;
  type_label?: string | null;
  title: string;
  body?: string | null;
  student_person_uuid: string | null;
  case_id: number | null;
  case_status_code: string;
  student_name_snapshot: string | null;
  reason_text: string | null;
  ref_entity?: string | null;
  ref_id?: string | null;
  seen_at?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  rows: NotificationItem[];
  totalCount: number;
  page: number;
  limit: number;
  unreadCount: number;
  unseenCount: number;
}
