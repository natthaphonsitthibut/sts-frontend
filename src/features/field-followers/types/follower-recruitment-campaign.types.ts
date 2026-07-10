import type { DataScope } from "../../auth/lib/permissions";

export interface FollowerRecruitmentCampaign {
  id: string;
  name: string;
  description: string | null;
  public_code: string;
  data_scope: DataScope;
  is_active: boolean;
  status: "ACTIVE" | "LOCKED" | "EXPIRED";
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
