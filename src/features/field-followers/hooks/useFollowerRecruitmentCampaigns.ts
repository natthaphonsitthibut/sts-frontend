import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { followerRecruitmentCampaignService } from "../api/follower-recruitment-campaign.service";
import type {
  CreateFollowerRecruitmentCampaignPayload,
  UpdateFollowerRecruitmentCampaignPayload,
} from "../types/follower-recruitment-campaign.types";

const CAMPAIGNS_QUERY_KEY = "follower-recruitment-campaigns";
const PUBLIC_CAMPAIGN_QUERY_KEY = "public-follower-recruitment-campaign";

export function useFollowerRecruitmentCampaigns() {
  return useQuery({
    queryKey: [CAMPAIGNS_QUERY_KEY],
    queryFn: () => followerRecruitmentCampaignService.list(),
  });
}

export function useCreateFollowerRecruitmentCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFollowerRecruitmentCampaignPayload) =>
      followerRecruitmentCampaignService.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [CAMPAIGNS_QUERY_KEY] });
    },
  });
}

export function useUpdateFollowerRecruitmentCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateFollowerRecruitmentCampaignPayload;
    }) => followerRecruitmentCampaignService.update(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [CAMPAIGNS_QUERY_KEY] });
    },
  });
}

export function useDeleteFollowerRecruitmentCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => followerRecruitmentCampaignService.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [CAMPAIGNS_QUERY_KEY] });
    },
  });
}

export function usePublicFollowerRecruitmentCampaign(code: string | undefined) {
  return useQuery({
    queryKey: [PUBLIC_CAMPAIGN_QUERY_KEY, code],
    queryFn: () => followerRecruitmentCampaignService.getPublicCampaign(code as string),
    enabled: Boolean(code),
    retry: false,
  });
}
