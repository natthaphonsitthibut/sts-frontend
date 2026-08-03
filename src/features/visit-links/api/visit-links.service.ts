import { apiClient } from "../../../lib/api-client";
import {
  normalizePaginatedResponse,
  toPaginationParams,
  type PaginatedResult,
} from "../../../lib/pagination";
import type { LinkAdminPayload, LinkAdminResponse } from "../types/link-admin.types";
import type {
  VisitLink,
  VisitLinkListQuery,
  VisitLinkSummary,
} from "../types/visit-links.types";

interface DataEnvelope<T> {
  data?: T;
}

export interface VisitLinksResult extends PaginatedResult<VisitLink> {
  summary: VisitLinkSummary;
}

async function getVisitLinksPage(
  query: VisitLinkListQuery = {},
): Promise<VisitLinksResult> {
  const params: Record<string, string> = toPaginationParams(query);
  if (query.status && query.status !== "ALL") {
    params.status = query.status;
  }
  const searchTerm = query.searchTerm?.trim();
  if (searchTerm) {
    params.searchTerm = searchTerm;
  }
  if (query.province?.trim()) {
    params.province = query.province.trim();
  }
  if (query.district?.trim()) {
    params.district = query.district.trim();
  }
  if (query.subDistrict?.trim()) {
    params.subDistrict = query.subDistrict.trim();
  }
  if (query.schoolId?.trim()) {
    params.schoolId = query.schoolId.trim();
  }
  if (query.gradeLevelId) {
    params.gradeLevelId = String(query.gradeLevelId);
  }
  if (query.room?.trim()) {
    params.room = query.room.trim();
  }

  const response = await apiClient.get<
    | VisitLink[]
    | (DataEnvelope<VisitLink[]> & { summary?: Partial<VisitLinkSummary> })
  >("/tasks/visit-links", { params });
  const result = normalizePaginatedResponse<VisitLink>(response.data, query);
  const summary = Array.isArray(response.data) ? undefined : response.data?.summary;
  return {
    ...result,
    summary: {
      total: summary?.total ?? result.meta.totalCount,
      active: summary?.active ?? 0,
      locked: summary?.locked ?? 0,
      expired: summary?.expired ?? 0,
      scheduled: summary?.scheduled ?? 0,
    },
  };
}

async function setLinkAdminLock(
  linkId: string,
  payload: LinkAdminPayload,
): Promise<LinkAdminResponse> {
  const response = await apiClient.post<LinkAdminResponse>(
    `/task-links/${linkId}/admin-lock`,
    payload,
  );
  return response.data;
}

export const visitLinksService = {
  getVisitLinksPage,
  setLinkAdminLock,
};
