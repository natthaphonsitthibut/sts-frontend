import { useQuery } from "@tanstack/react-query";
import {
  workSessionMonitorService,
  type WorkSessionMonitorFilters,
} from "../api/work-session-monitor.service";

const POLL_INTERVAL_MS = 20_000;

export function useWorkSessionMonitor(filters: WorkSessionMonitorFilters = {}) {
  return useQuery({
    queryKey: ["field-monitor-work-sessions", filters],
    queryFn: () => workSessionMonitorService.getWorkSessions(filters),
    refetchInterval: POLL_INTERVAL_MS,
  });
}
