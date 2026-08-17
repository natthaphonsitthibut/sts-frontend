import { useQuery } from "@tanstack/react-query";
import { statusCatalogService } from "../api/status-catalog.service";
import type {
  StatusCatalogDomain,
  StatusCatalogItem,
} from "../types/status-catalog.types";

const EMPTY_STATUS_CATALOG: StatusCatalogItem[] = [];

export function useStatusCatalogs() {
  return useQuery({
    queryKey: ["status-catalogs"],
    queryFn: statusCatalogService.getCatalogs,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicAttendanceStatusCatalog() {
  return useQuery({
    queryKey: ["public-status-catalog", "attendance-record"],
    queryFn: statusCatalogService.getPublicAttendanceRecordCatalog,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicAttendanceDelegationStatusCatalog() {
  return useQuery({
    queryKey: ["public-status-catalog", "attendance-delegation"],
    queryFn: statusCatalogService.getPublicAttendanceDelegationCatalog,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStatusCatalog(domain: StatusCatalogDomain): {
  items: StatusCatalogItem[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const query = useStatusCatalogs();
  return {
    items: query.data?.[domain] ?? EMPTY_STATUS_CATALOG,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}

export function findStatusCatalogItem(
  items: readonly StatusCatalogItem[],
  code: string | number | null | undefined,
): StatusCatalogItem | undefined {
  const normalized = String(code ?? "");
  return items.find(
    (item) => item.code === normalized || item.internalCode === normalized,
  );
}
