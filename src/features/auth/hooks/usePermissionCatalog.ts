import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getPermissionCatalog,
  type PermissionCatalogItem,
} from "../api/permission.service";

const EMPTY: PermissionCatalogItem[] = [];

/**
 * Fetches the canonical permission catalog (id + Thai label) from the backend
 * so the checkbox editor and review dialog never hardcode or drift from the
 * server's valid permission set.
 */
export function usePermissionCatalog() {
  const query = useQuery({
    queryKey: ["permission-catalog"],
    queryFn: getPermissionCatalog,
    staleTime: 5 * 60 * 1000,
  });
  const catalog = query.data ?? EMPTY;
  const labelOf = useMemo(() => {
    const map = new Map(catalog.map((item) => [item.id, item.label]));
    return (id: string) => map.get(id) ?? id;
  }, [catalog]);

  return {
    catalog,
    labelOf,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
