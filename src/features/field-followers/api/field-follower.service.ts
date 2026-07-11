import { apiClient } from "../../../lib/api-client";
import type {
  CreateFollowerApplicationPayload,
  FieldFollower,
  FieldFollowerListParams,
  FieldFollowerListResponse,
  FieldFollowerReviewAction,
  FieldFollowerReviewResponse,
  FollowerIdCardUploadResponse,
} from "../types/field-follower.types";
import type { FieldMonitorMapResponse } from "../types/field-monitor-map.types";

async function apply(payload: CreateFollowerApplicationPayload): Promise<{ success: true }> {
  const response = await apiClient.post<{ success: true }>(
    "/public/follower-applications",
    payload,
  );
  return response.data;
}

async function uploadIdCardPhoto(file: File): Promise<FollowerIdCardUploadResponse> {
  const formData = new FormData();
  formData.append("photo", file);
  const response = await apiClient.post<FollowerIdCardUploadResponse>(
    "/public/follower-applications/id-card-photo",
    formData,
  );
  return response.data;
}

async function listFollowers(
  params: FieldFollowerListParams,
): Promise<FieldFollowerListResponse> {
  const response = await apiClient.get<FieldFollowerListResponse>("/field-followers", {
    params: {
      page: params.page,
      limit: params.limit,
      ...(params.status ? { status: params.status } : {}),
      ...(params.province ? { province: params.province } : {}),
      ...(params.district ? { district: params.district } : {}),
      ...(params.subDistrict ? { subDistrict: params.subDistrict } : {}),
      ...(params.searchTerm ? { searchTerm: params.searchTerm } : {}),
      ...(params.campaignId ? { campaignId: params.campaignId } : {}),
    },
  });
  return response.data;
}

async function getFollower(id: string): Promise<FieldFollower> {
  const response = await apiClient.get<{ success: true; data: FieldFollower }>(
    `/field-followers/${encodeURIComponent(id)}`,
  );
  return response.data.data;
}

async function reviewFollower(
  id: string,
  action: FieldFollowerReviewAction,
): Promise<FieldFollowerReviewResponse> {
  const response = await apiClient.post<FieldFollowerReviewResponse>(
    `/field-followers/${id}/review`,
    { action },
  );
  return response.data;
}

async function getMap(studentUuids: string[]): Promise<FieldMonitorMapResponse> {
  const response = await apiClient.get<FieldMonitorMapResponse>("/field-monitor/map", {
    params: { studentUuids: studentUuids.join(",") },
  });
  return response.data;
}

export const fieldFollowerService = {
  apply,
  getFollower,
  listFollowers,
  reviewFollower,
  uploadIdCardPhoto,
  getMap,
};
