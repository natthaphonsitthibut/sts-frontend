import { apiClient } from "../../../lib/api-client";

interface DataEnvelope<T> {
  data?: T;
}

export interface GradeLevelOption {
  id: number;
  label: string;
  category?: string;
}

export interface SchoolOption {
  id: number;
  name: string;
  province?: string;
  district?: string;
  sub_district?: string;
}

function unwrapData<T>(data: T | DataEnvelope<T>): T {
  if (data && typeof data === "object" && "data" in data) {
    return (data as DataEnvelope<T>).data as T;
  }
  return data as T;
}

async function getGradeLevels(): Promise<GradeLevelOption[]> {
  const response = await apiClient.get<GradeLevelOption[] | DataEnvelope<GradeLevelOption[]>>(
    "/api/attendance/grade-levels",
  );
  return unwrapData(response.data) || [];
}

async function getSchools(): Promise<SchoolOption[]> {
  const response = await apiClient.get<SchoolOption[] | DataEnvelope<SchoolOption[]>>(
    "/api/attendance/schools",
  );
  return unwrapData(response.data) || [];
}

async function getRooms(grade: string, schoolId?: string): Promise<string[]> {
  if (!grade.trim()) {
    return [];
  }

  const response = await apiClient.get<string[] | DataEnvelope<string[]>>(
    "/api/attendance/rooms",
    {
      params: {
        grade,
        schoolId: schoolId || undefined,
      },
    },
  );
  return unwrapData(response.data) || [];
}

export const attendanceLookupService = {
  getGradeLevels,
  getRooms,
  getSchools,
};
