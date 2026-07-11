import type { DataScope } from "../../auth/lib/permissions";

export interface FollowerRecruitmentCampaign {
  id: string;
  name: string;
  description: string | null;
  public_code: string;
  data_scope: DataScope;
  is_active: boolean;
  status: "ACTIVE" | "LOCKED" | "EXPIRED" | "SCHEDULED";
  is_open: boolean;
  opens_at: string | null;
  closes_at: string | null;
  view_count: number;
  submission_count: number;
  created_at: string;
  updated_at: string;
}

export interface FollowerRecruitmentCampaignListResponse {
  success: true;
  data: FollowerRecruitmentCampaign[];
  meta: { totalCount: number };
}

export interface FollowerRecruitmentCampaignResponse {
  success: true;
  data: FollowerRecruitmentCampaign;
}

export interface CreateFollowerRecruitmentCampaignPayload {
  name: string;
  description?: string;
  data_scope?: DataScope;
  opens_at?: string;
  closes_at?: string;
}

export interface UpdateFollowerRecruitmentCampaignPayload {
  name?: string;
  description?: string;
  data_scope?: DataScope;
  opens_at?: string;
  closes_at?: string;
  is_active?: boolean;
}

export interface PublicCampaignInfo {
  name: string;
  is_open: boolean;
}

export interface FollowerCampaignTarget {
  id: string;
  campaign_id: string;
  case_id: number;
  status: "OPEN" | "ASSIGNED" | "COMPLETED" | "CANCELED";
  assigned_follower_id: string | null;
  assigned_task_link_id: string | null;
  assigned_at: string | null;
  assigned_by: number | null;
  case: {
    student_name: string | null;
    student_id: string | null;
    student_school: string | null;
    student_address: string | null;
    reason_flagged: string | null;
  };
  assigned_follower: {
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface FollowerCampaignTargetsResponse {
  success: true;
  data: FollowerCampaignTarget[];
  meta: { totalCount: number };
}

export interface FollowerCampaignAssignPreviewResponse {
  success: true;
  data: {
    target: FollowerCampaignTarget;
    prefill: {
      task_type: "VISIT";
      existing_case_id: number;
      student_id: string | null;
      student_name: string | null;
      student_school: string | null;
      student_address: string | null;
      reason_flagged: string | null;
      assigned_to_name: string;
      assigned_to_phone: string | null;
      assigned_to_email: string;
      source_field_follower_id: string;
      campaign_target_id: string;
    };
  };
}
