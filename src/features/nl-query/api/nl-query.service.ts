import { apiClient } from "../../../lib/api-client";
import type {
  NlQueryPayload,
  NlQuerySchema,
  QueryEnvelope,
} from "../types/nl-query.types";

const QUERY_TIMEOUT_MS = 65_000;

export async function askNlQuery(
  payload: NlQueryPayload,
): Promise<QueryEnvelope> {
  const response = await apiClient.post<QueryEnvelope>("/nl-query", payload, {
    timeout: QUERY_TIMEOUT_MS,
  });
  return response.data;
}

export async function fetchNlSchema(): Promise<NlQuerySchema> {
  const response = await apiClient.get<NlQuerySchema>("/nl-query/schema");
  return response.data;
}
