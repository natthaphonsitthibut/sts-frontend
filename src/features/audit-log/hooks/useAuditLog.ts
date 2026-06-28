import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { auditLogService } from "../api/audit-log.service";
import type { AuditLogEntry, AuditLogQuery } from "../types/audit-log.types";
import type { PaginationMeta } from "../../../lib/pagination";

export const AUDIT_LOG_QUERY_KEY = "audit-log";

const EMPTY_AUDIT_LOG: AuditLogEntry[] = [];

interface UseAuditLogResult {
  entries: AuditLogEntry[];
  meta: PaginationMeta | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useAuditLog(query: AuditLogQuery): UseAuditLogResult {
  const result = useQuery({
    queryKey: [AUDIT_LOG_QUERY_KEY, query],
    queryFn: () => auditLogService.getAuditLog(query),
    placeholderData: keepPreviousData,
  });

  return {
    entries: result.data?.items ?? EMPTY_AUDIT_LOG,
    meta: result.data?.meta,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    refetch: () => {
      void result.refetch();
    },
  };
}
