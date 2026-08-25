import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../../lib/api-error";
import { Alert, AlertDescription } from "./alert";

interface FormErrorAlertProps {
  /** The mutation/query error (e.g. `mutation.error`). Renders nothing when falsy. */
  error: unknown;
  /** Shown when the backend gives no usable message. */
  fallback: string;
  className?: string;
  dismissible?: boolean;
  autoDismissMs?: number;
}

/**
 * The single way every form surfaces a submit error: it reads the real backend
 * message via `getApiErrorMessage` and renders it in the shared destructive
 * Alert. Forms must not hand-roll their own error alert / generic string.
 */
export function FormErrorAlert({
  error,
  fallback,
  className,
  dismissible = false,
  autoDismissMs,
}: FormErrorAlertProps) {
  const [dismissedError, setDismissedError] = useState<unknown>(null);
  const dismissed = Boolean(error) && dismissedError === error;

  useEffect(() => {
    if (!error || !autoDismissMs || dismissed) return;
    const timer = window.setTimeout(
      () => setDismissedError(error),
      autoDismissMs,
    );
    return () => window.clearTimeout(timer);
  }, [autoDismissMs, dismissed, error]);

  if (!error || dismissed) {
    return null;
  }

  return (
    <Alert
      className={className}
      onDismiss={dismissible ? () => setDismissedError(error) : undefined}
      variant="destructive"
    >
      <AlertDescription>{getApiErrorMessage(error, fallback)}</AlertDescription>
    </Alert>
  );
}
