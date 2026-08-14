import { Lock, LockOpen } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, IconButton, useConfirm } from "../base";
import { cn } from "../../lib/utils";
import { taskService } from "../../features/tasks/api/task.service";
import { getLinkLockConfirm, isLinkLocked } from "../../lib/link-lock";

export interface LinkLockToggleButtonProps {
  linkId: string;
  /** Current locked flag from the link (number / boolean both accepted). */
  locked: boolean | number;
  /** Query keys to refresh after toggling (detail page + its dashboard list). */
  invalidateKeys?: readonly unknown[][];
  className?: string;
  disabled?: boolean;
  iconOnly?: boolean;
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
  disabled = false,
  iconOnly = false,
}: LinkLockToggleButtonProps) {
  const isLocked = isLinkLocked(locked);
  const { confirm, dialog } = useConfirm();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      taskService.setTaskLinkAdminLock(linkId, {
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
    if (disabled) return;
    const confirmed = await confirm(getLinkLockConfirm(isLocked));
    if (!confirmed) {
      return;
    }
    mutation.mutate();
  }

  const label = isLocked ? "เปิดลิงก์" : "ปิดลิงก์";

  // Icon-only mode sits in the same action row as share and view, so it uses the
  // shared IconButton with a semantic variant — same size, solid surface, white
  // glyph and hover motion — instead of a one-off outline button.
  return (
    <>
      {iconOnly ? (
        <IconButton
          aria-label={label}
          className={className}
          disabled={disabled || mutation.isPending}
          icon={isLocked ? LockOpen : Lock}
          onClick={() => void handleClick()}
          variant={isLocked ? "unlock" : "lock"}
        />
      ) : (
        <Button
          aria-label={label}
          className={cn("min-w-[112px]", className)}
          disabled={disabled}
          icon={isLocked ? LockOpen : Lock}
          isLoading={mutation.isPending}
          onClick={() => void handleClick()}
          size="md"
          variant={isLocked ? "outline" : "destructive"}
        >
          {label}
        </Button>
      )}
      {dialog}
    </>
  );
}
