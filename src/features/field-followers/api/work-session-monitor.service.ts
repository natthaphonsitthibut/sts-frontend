import { apiClient } from "../../../lib/api-client";
import type { WorkSessionMonitorResponse } from "../types/work-session-monitor.types";

export interface WorkSessionMonitorFilters {
  schoolId?: string;
  province?: string;
  district?: string;
  subDistrict?: string;
  grade?: string;
  room?: string;
}

async function getWorkSessions(
  filters: WorkSessionMonitorFilters = {},
): Promise<WorkSessionMonitorResponse> {
  const response = await apiClient.get<WorkSessionMonitorResponse>(
    "/field-monitor/work-sessions",
    {
      params: {
        schoolId: filters.schoolId || undefined,
        province: filters.province || undefined,
        district: filters.district || undefined,
        subDistrict: filters.subDistrict || undefined,
        grade: filters.grade || undefined,
        room: filters.room || undefined,
      },
    },
  );
  return response.data;
}

export const workSessionMonitorService = { getWorkSessions };
