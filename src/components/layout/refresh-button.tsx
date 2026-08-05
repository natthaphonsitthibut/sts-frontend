import { RotateCw } from "lucide-react";
import { Button } from "../base";
import { useRefreshSpin } from "../../hooks/useRefreshSpin";
import { formatThaiDateTime } from "../../lib/date-time";

interface RefreshButtonProps {
  disabled?: boolean;
  /** Timestamp of the data this action refreshes (normally React Query's dataUpdatedAt). */
  updatedAt: string | number | Date | null | undefined;
  /** The refresh action (e.g. `() => query.refetch()`). */
  onRefresh: () => Promise<unknown> | unknown;
}

/**
 * The one refresh button for the whole app — same icon, variant, label and spin
 * motion everywhere. Owns its own minimum-spin state via {@link useRefreshSpin} so
 * a fast refetch still reads as a real refresh. Use this instead of hand-rolling a
 * refresh `Button` on each page.
 */
export function RefreshButton({ disabled = false, onRefresh, updatedAt }: RefreshButtonProps) {
  const { isRefreshing, refresh } = useRefreshSpin();
  const parsedUpdatedAt =
    typeof updatedAt === "number"
      ? (updatedAt > 0 ? new Date(updatedAt) : null)
      : typeof updatedAt === "string"
        ? new Date(updatedAt)
        : updatedAt;
  const updatedDate =
    parsedUpdatedAt && !Number.isNaN(parsedUpdatedAt.getTime())
      ? parsedUpdatedAt
      : null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs text-slate-500 tabular-nums">
        {updatedDate
          ? `ข้อมูลล่าสุด ${formatThaiDateTime(updatedDate)}`
          : "ยังไม่มีเวลาอัปเดต"}
      </span>
      <Button
        icon={RotateCw}
        isLoading={isRefreshing}
        disabled={disabled}
        loadingIconMotion="refresh"
        loadingText="รีเฟรช"
        onClick={() => void refresh(onRefresh)}
        variant="outline"
      >
        รีเฟรช
      </Button>
    </div>
  );
}
