import { apiClient } from "../../../lib/api-client";
import type { WorkSessionMonitorResponse } from "../types/work-session-monitor.types";

async function getWorkSessions(): Promise<WorkSessionMonitorResponse> {
  const response = await apiClient.get<WorkSessionMonitorResponse>(
    "/field-monitor/work-sessions",
  );
  return response.data;
}

export const workSessionMonitorService = { getWorkSessions };
