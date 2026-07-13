import { RotateCw } from "lucide-react";
import { Button } from "../base";
import { useRefreshSpin } from "../../hooks/useRefreshSpin";

interface RefreshButtonProps {
  /** The refresh action (e.g. `() => query.refetch()`). */
  onRefresh: () => Promise<unknown> | unknown;
}

/**
 * The one refresh button for the whole app — same icon, variant, label and spin
 * motion everywhere. Owns its own minimum-spin state via {@link useRefreshSpin} so
 * a fast refetch still reads as a real refresh. Use this instead of hand-rolling a
 * refresh `Button` on each page.
 */
export function RefreshButton({ onRefresh }: RefreshButtonProps) {
  const { isRefreshing, refresh } = useRefreshSpin();
  return (
    <Button
      className="border-transparent bg-primary-soft text-primary-dark hover:border-transparent hover:bg-primary/15 hover:text-primary-dark"
      icon={RotateCw}
      isLoading={isRefreshing}
      loadingIconMotion="refresh"
      loadingText="รีเฟรช"
      onClick={() => void refresh(onRefresh)}
      variant="secondary"
    >
      รีเฟรช
    </Button>
  );
}
