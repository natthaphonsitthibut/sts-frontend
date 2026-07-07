import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../api/task.service";
import type { WorkSessionEndReason } from "../types/task.types";

const WORK_SESSION_STATUS_QUERY_KEY = "work-session-status";
const geolocationUnavailable = typeof navigator === "undefined" || !navigator.geolocation;

/**
 * Backs the guest "เริ่ม/จบปฏิบัติงาน" flow — status is re-fetched (not just
 * held locally) so a page reload mid-fieldwork resumes the ping loop instead
 * of losing track of an already-open session.
 */
export function useWorkSession(token: string, sessionToken?: string, enabled = true) {
  const queryClient = useQueryClient();
  const [pingFailed, setPingFailed] = useState(false);

  const statusQuery = useQuery({
    queryKey: [WORK_SESSION_STATUS_QUERY_KEY, token],
    queryFn: () => taskService.getWorkSessionStatus(token, sessionToken),
    enabled: Boolean(token) && enabled,
  });
  const session = statusQuery.data?.session ?? null;

  function invalidateStatus(): Promise<unknown> {
    return queryClient.invalidateQueries({ queryKey: [WORK_SESSION_STATUS_QUERY_KEY, token] });
  }

  const startMutation = useMutation({
    mutationFn: () => taskService.startWorkSession(token, sessionToken),
    onSuccess: () => void invalidateStatus(),
    throwOnError: false,
  });

  const endMutation = useMutation({
    mutationFn: (reason?: WorkSessionEndReason) =>
      taskService.endWorkSession(token, sessionToken, reason),
    onSuccess: () => void invalidateStatus(),
    throwOnError: false,
  });

  const pingMutation = useMutation({
    mutationFn: (coords: { lat: number; lng: number }) =>
      taskService.sendWorkSessionPosition(token, coords.lat, coords.lng, sessionToken),
    onError: () => setPingFailed(true),
    onSuccess: () => setPingFailed(false),
  });

  useEffect(() => {
    if (!session || geolocationUnavailable) {
      return;
    }

    function pingOnce(): void {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          pingMutation.mutate({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        () => setPingFailed(true),
        { enableHighAccuracy: true, maximumAge: 25_000, timeout: 15_000 },
      );
    }

    pingOnce();
    const interval = window.setInterval(pingOnce, session.ping_interval_seconds * 1000);
    return () => window.clearInterval(interval);
    // Restart the loop only when the open session identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  return {
    session,
    isLoading: statusQuery.isLoading,
    pingFailed,
    geolocationUnavailable,
    start: startMutation,
    end: endMutation,
  };
}
