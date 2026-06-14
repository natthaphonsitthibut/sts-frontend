import { Lock, LockOpen } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, useConfirm } from "../base";
import { cn } from "../../lib/utils";
import { loginLinksService } from "../../features/login-links/api/login-links.service";
import { getLinkLockConfirm, isLinkLocked } from "../../lib/link-lock";

export interface LinkLockToggleButtonProps {
  linkId: string;
  /** Current locked flag from the link (number / boolean both accepted). */
  locked: boolean | number;
  /** Query keys to refresh after toggling (detail page + its dashboard list). */
  invalidateKeys?: readonly unknown[][];
  className?: string;
}

/**
 * Shared open/close-link control. One source of truth for the admin lock action
 * — same confirm dialog ({@link useConfirm} + {@link getLinkLockConfirm}), lock
 * call and cache refresh as the dashboards — so every detail page (login /
 * attendance / visit) toggles a link the same way and looks like the table's
 * open/close button (outline when closed, destructive when open).
 */
export function LinkLockToggleButton({
  linkId,
  locked,
  invalidateKeys,
  className,
}: LinkLockToggleButtonProps) {
  const isLocked = isLinkLocked(locked);
  const { confirm, dialog } = useConfirm();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      loginLinksService.setLinkAdminLock(linkId, {
        action: isLocked ? "unlock" : "lock",
        reason: isLocked
          ? "เปิดลิงก์อีกครั้งโดยผู้ดูแลระบบ"
          : "ปิดลิงก์โดยผู้ดูแลระบบ",
      }),
    onSuccess: () => {
      (invalidateKeys ?? []).forEach((queryKey) => {
        void queryClient.invalidateQueries({ queryKey });
      });
    },
  });

  async function handleClick(): Promise<void> {
    const confirmed = await confirm(getLinkLockConfirm(isLocked));
    if (!confirmed) {
      return;
    }
    mutation.mutate();
  }

  return (
    <>
      <Button
        className={cn("min-w-[88px]", className)}
        icon={isLocked ? LockOpen : Lock}
        variant={isLocked ? "outline" : "destructive"}
        isLoading={mutation.isPending}
        onClick={() => void handleClick()}
      >
        {isLocked ? "เปิด" : "ปิด"}
      </Button>
      {dialog}
    </>
  );
}
