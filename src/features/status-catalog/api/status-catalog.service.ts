import { apiClient } from "../../../lib/api-client";
import type { StatusCatalogItem, StatusCatalogs } from "../types/status-catalog.types";

async function getCatalogs(): Promise<StatusCatalogs> {
  const response = await apiClient.get<StatusCatalogs>("/status-catalogs");
  return response.data;
}

async function getPublicAttendanceRecordCatalog(): Promise<StatusCatalogItem[]> {
  const response = await apiClient.get<StatusCatalogItem[]>(
    "/public/status-catalogs/attendance-record",
  );
  return response.data;
}

async function getPublicAttendanceDelegationCatalog(): Promise<StatusCatalogItem[]> {
  const response = await apiClient.get<StatusCatalogItem[]>(
    "/public/status-catalogs/attendance-delegation",
  );
  return response.data;
}

export const statusCatalogService = {
  getCatalogs,
  getPublicAttendanceDelegationCatalog,
  getPublicAttendanceRecordCatalog,
};
