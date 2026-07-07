import { useQuery } from "@tanstack/react-query";
import { workSessionMonitorService } from "../api/work-session-monitor.service";

const POLL_INTERVAL_MS = 20_000;

export function useWorkSessionMonitor() {
  return useQuery({
    queryKey: ["field-monitor-work-sessions"],
    queryFn: () => workSessionMonitorService.getWorkSessions(),
    refetchInterval: POLL_INTERVAL_MS,
  });
}
