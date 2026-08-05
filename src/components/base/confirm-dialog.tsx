import { useCallback, useRef, useState, type ReactNode } from "react";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";

export interface ConfirmOptions {
  title: ReactNode;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** "destructive" for irreversible actions (delete / lock), "default" otherwise. */
  variant?: "default" | "destructive";
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

const INITIAL_STATE: ConfirmState = { open: false, title: "" };

/**
 * Central confirm dialog — every confirm/cancel flow in the app goes through this
 * so the dialog shell, ยืนยัน/ยกเลิก buttons, and motion stay identical everywhere.
 *
 * Usage:
 *   const { confirm, dialog } = useConfirm();
 *   const ok = await confirm({ title: "...", variant: "destructive" });
 *   // render {dialog} once in the page
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(INITIAL_STATE);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ ...options, open: true });
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState((current) => ({ ...current, open: false }));
  }, []);

  const dialog = (
    <Dialog open={state.open} onOpenChange={(open) => (open ? undefined : close(false))}>
      <DialogContent className="max-w-sm" onClose={() => close(false)}>
        <DialogHeader>
          <DialogTitle>{state.title}</DialogTitle>
          {state.description ? (
            <DialogDescription>{state.description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => close(false)} variant="outline">
            {state.cancelText ?? "ยกเลิก"}
          </Button>
          <Button onClick={() => close(true)} variant={state.variant ?? "default"}>
            {state.confirmText ?? "ยืนยัน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, dialog };
}
