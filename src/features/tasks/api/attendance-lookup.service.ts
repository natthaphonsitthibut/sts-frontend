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

export interface LocationCatalog {
  provinces: string[];
  districts: { province: string; district: string }[];
  subDistricts: { province: string; district: string; sub_district: string }[];
}

export interface GetSchoolsParams {
  province?: string;
  district?: string;
  subDistrict?: string;
  searchTerm?: string;
  limit?: number;
}

function unwrapData<T>(data: T | DataEnvelope<T>): T {
  if (data && typeof data === "object" && "data" in data) {
    return (data as DataEnvelope<T>).data as T;
  }
  return data as T;
}

async function getGradeLevels(): Promise<GradeLevelOption[]> {
  const response = await apiClient.get<GradeLevelOption[] | DataEnvelope<GradeLevelOption[]>>(
    "/attendance/grade-levels",
  );
  return unwrapData(response.data) || [];
}

async function getSchools(params: GetSchoolsParams = {}): Promise<SchoolOption[]> {
  const response = await apiClient.get<SchoolOption[] | DataEnvelope<SchoolOption[]>>(
    "/attendance/schools",
    {
      params: {
        province: params.province || undefined,
        district: params.district || undefined,
        subDistrict: params.subDistrict || undefined,
        searchTerm: params.searchTerm?.trim() || undefined,
        limit: params.limit ?? undefined,
      },
    },
  );
  return unwrapData(response.data) || [];
}

/** Area catalog only (no student or account data), so guest forms can read it unauthenticated. */
async function getLocations(): Promise<LocationCatalog> {
  const response = await apiClient.get<LocationCatalog | DataEnvelope<LocationCatalog>>(
    "/public/locations",
  );
  return unwrapData(response.data) || { provinces: [], districts: [], subDistricts: [] };
}

async function getRooms(grade: string, schoolId?: string): Promise<string[]> {
  if (!grade.trim()) {
    return [];
  }

  const response = await apiClient.get<string[] | DataEnvelope<string[]>>(
    "/attendance/rooms",
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
  getLocations,
};
