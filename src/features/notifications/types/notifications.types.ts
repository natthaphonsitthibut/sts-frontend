export interface NotificationItem {
  id: string;
  type_code: string;
  type_label?: string | null;
  title: string;
  body?: string | null;
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
