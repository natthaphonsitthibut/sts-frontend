import { apiClient } from "../../../lib/api-client";
import type {
  ConversationDetail,
  ConversationPage,
  ConversationSummary,
  NlQueryPayload,
  NlQueryResponse,
  NlQuerySchema,
} from "../types/nl-query.types";

const QUERY_TIMEOUT_MS = 65_000;

export async function askNlQuery(
  payload: NlQueryPayload,
): Promise<NlQueryResponse> {
  const response = await apiClient.post<NlQueryResponse>("/nl-query", payload, {
    timeout: QUERY_TIMEOUT_MS,
  });
  return response.data;
}

export async function fetchNlSchema(): Promise<NlQuerySchema> {
  const response = await apiClient.get<NlQuerySchema>("/nl-query/schema");
  return response.data;
}

export async function listNlConversations(params?: {
  limit?: number;
  before?: string;
}): Promise<ConversationPage> {
  const response = await apiClient.get<ConversationPage>(
    "/nl-query/conversations",
    { params },
  );
  return response.data;
}

export async function getNlConversation(
  id: string,
): Promise<ConversationDetail> {
  const response = await apiClient.get<ConversationDetail>(
    `/nl-query/conversations/${id}`,
  );
  return response.data;
}

export async function renameNlConversation(
  id: string,
  title: string,
): Promise<ConversationSummary> {
  const response = await apiClient.patch<ConversationSummary>(
    `/nl-query/conversations/${id}`,
    { title },
  );
  return response.data;
}

export async function deleteNlConversation(id: string): Promise<void> {
  await apiClient.delete(`/nl-query/conversations/${id}`);
}
