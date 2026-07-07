export const FIELD_FOLLOWER_STATUSES = ["APPLIED", "VERIFIED", "ACTIVE", "SUSPENDED"] as const;
export type FieldFollowerStatus = (typeof FIELD_FOLLOWER_STATUSES)[number];

export const FIELD_FOLLOWER_REVIEW_ACTIONS = [
  "APPROVE",
  "REJECT",
  "SUSPEND",
  "REACTIVATE",
] as const;
export type FieldFollowerReviewAction = (typeof FIELD_FOLLOWER_REVIEW_ACTIONS)[number];

export interface FieldFollower {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  sub_district: string | null;
  district: string | null;
  province: string | null;
  status: FieldFollowerStatus;
  trust_level: string;
  applied_via: string | null;
  reviewed_by_user_id: number | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FieldFollowerListParams {
  status?: FieldFollowerStatus;
  province?: string;
  district?: string;
  subDistrict?: string;
  page: number;
  limit: number;
}

export interface FieldFollowerPaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface FieldFollowerListResponse {
  success: true;
  data: FieldFollower[];
  meta: FieldFollowerPaginationMeta;
}

export interface FieldFollowerReviewResponse {
  success: true;
  data: FieldFollower;
}

export interface CreateFollowerApplicationPayload {
  first_name: string;
  last_name: string;
  phone: string;
  sub_district?: string;
  district?: string;
  province?: string;
  /** Honeypot — real users never fill this; kept empty on submit. */
  website?: string;
}
