import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { apiClient } from "../lib/api-client";

export interface RecordedRequest {
  url: string;
  params: Record<string, unknown>;
}

let previousAdapter: typeof apiClient.defaults.adapter;

/**
 * Serves every page request from fixtures through the shared axios instance, so
 * a test can assert what the UI would really send to the API instead of mocking
 * each service module. Returns the recorded requests in call order.
 */
export function stubApiRequests(
  fixtures: Record<string, unknown> = {},
  fallback: unknown = { data: [] },
): RecordedRequest[] {
  const requests: RecordedRequest[] = [];
  previousAdapter = apiClient.defaults.adapter;

  apiClient.defaults.adapter = async (
    config: InternalAxiosRequestConfig,
  ): Promise<AxiosResponse> => {
    const url = config.url ?? "";
    requests.push({
      url,
      params: { ...((config.params as Record<string, unknown>) ?? {}) },
    });
    return {
      data: url in fixtures ? fixtures[url] : fallback,
      status: 200,
      statusText: "OK",
      headers: config.headers,
      config,
    };
  };

  return requests;
}

export function restoreApiStub(): void {
  apiClient.defaults.adapter = previousAdapter;
}

/** The last request recorded for an endpoint, or undefined when it never ran. */
export function lastRequestTo(
  requests: RecordedRequest[],
  url: string,
): RecordedRequest | undefined {
  return requests.filter((request) => request.url === url).at(-1);
}
