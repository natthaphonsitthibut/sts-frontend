import { apiClient } from "../../../lib/api-client";

export interface PermissionCatalogItem {
  id: string;
  label: string;
}

interface PermissionCatalogResponse {
  success: boolean;
  data: PermissionCatalogItem[];
}

/** Canonical grantable-permission catalog (id + Thai label) from the backend. */
export async function getPermissionCatalog(): Promise<PermissionCatalogItem[]> {
  const response = await apiClient.get<PermissionCatalogResponse>("/users/permissions");
  return response.data.data ?? [];
}
