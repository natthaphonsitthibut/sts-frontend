import { apiClient } from "../../../lib/api-client";
import type {
  CreateFollowerRecruitmentCampaignPayload,
  FollowerCampaignAssignPreviewResponse,
  FollowerCampaignTargetsResponse,
  FollowerRecruitmentCampaignListResponse,
  FollowerRecruitmentCampaignResponse,
  PublicCampaignInfo,
  UpdateFollowerRecruitmentCampaignPayload,
} from "../types/follower-recruitment-campaign.types";

async function list(): Promise<FollowerRecruitmentCampaignListResponse> {
  const response = await apiClient.get<FollowerRecruitmentCampaignListResponse>(
    "/follower-recruitment-campaigns",
  );
  return response.data;
}

async function create(
  payload: CreateFollowerRecruitmentCampaignPayload,
): Promise<FollowerRecruitmentCampaignResponse> {
  const response = await apiClient.post<FollowerRecruitmentCampaignResponse>(
    "/follower-recruitment-campaigns",
    payload,
  );
  return response.data;
}

async function update(
  id: string,
  payload: UpdateFollowerRecruitmentCampaignPayload,
): Promise<FollowerRecruitmentCampaignResponse> {
  const response = await apiClient.patch<FollowerRecruitmentCampaignResponse>(
    `/follower-recruitment-campaigns/${id}`,
    payload,
  );
  return response.data;
}

async function remove(id: string): Promise<{ success: true }> {
  const response = await apiClient.delete<{ success: true }>(
    `/follower-recruitment-campaigns/${id}`,
  );
  return response.data;
}

async function getPublicCampaign(code: string): Promise<PublicCampaignInfo> {
  const response = await apiClient.get<PublicCampaignInfo>(
    `/public/follower-applications/campaign/${code}`,
  );
  return response.data;
}

async function listTargets(campaignId: string): Promise<FollowerCampaignTargetsResponse> {
  const response = await apiClient.get<FollowerCampaignTargetsResponse>(
    `/follower-recruitment-campaigns/${campaignId}/targets`,
  );
  return response.data;
}

async function addTargets(
  campaignId: string,
  caseIds: number[],
): Promise<FollowerCampaignTargetsResponse> {
  const response = await apiClient.post<FollowerCampaignTargetsResponse>(
    `/follower-recruitment-campaigns/${campaignId}/targets`,
    { case_ids: caseIds },
  );
  return response.data;
}

async function prepareAssignment(
  targetId: string,
  followerId: number,
): Promise<FollowerCampaignAssignPreviewResponse> {
  const response = await apiClient.post<FollowerCampaignAssignPreviewResponse>(
    `/follower-recruitment-campaigns/targets/${targetId}/assign-preview`,
    { follower_id: followerId },
  );
  return response.data;
}

export const followerRecruitmentCampaignService = {
  list,
  create,
  update,
  remove,
  getPublicCampaign,
  listTargets,
  addTargets,
  prepareAssignment,
};
