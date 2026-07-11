export const FIELD_FOLLOWER_STATUSES = ["APPLIED", "VERIFIED", "ACTIVE", "SUSPENDED"] as const;
export type FieldFollowerStatus = (typeof FIELD_FOLLOWER_STATUSES)[number];

export const FIELD_FOLLOWER_REVIEW_ACTIONS = [
  "VERIFY",
  "APPROVE",
  "REJECT",
  "SUSPEND",
  "REACTIVATE",
] as const;
export type FieldFollowerReviewAction = (typeof FIELD_FOLLOWER_REVIEW_ACTIONS)[number];
export type FieldFollowerVerificationMethod = "THAID" | "ID_CARD_PHOTO";

export interface FieldFollower {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  gender: string | null;
  verification_method: FieldFollowerVerificationMethod | "PENDING";
  thaid_person_ref: string | null;
  id_card_photo_filename: string | null;
  id_card_photo_uploaded_at: string | null;
  sub_district: string | null;
  district: string | null;
  province: string | null;
  status: FieldFollowerStatus;
  trust_level: string;
  applied_via: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  reviewed_by_user_id: number | null;
  reviewed_at: string | null;
  verified_by_user_id: number | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FieldFollowerListParams {
  status?: FieldFollowerStatus;
  province?: string;
  district?: string;
  subDistrict?: string;
  searchTerm?: string;
  campaignId?: string;
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
  email: string;
  gender?: string;
  verification_method: FieldFollowerVerificationMethod;
  thaid_person_ref?: string;
  id_card_photo_filename?: string;
  sub_district?: string;
  district?: string;
  province?: string;
  /** Recruitment link this application was submitted through, if any. */
  campaign_code?: string;
  /** Honeypot — real users never fill this; kept empty on submit. */
  website?: string;
}

export interface FollowerIdCardUploadResponse {
  success: true;
  data: { filename: string; url: string };
}
