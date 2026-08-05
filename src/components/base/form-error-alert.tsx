import { getApiErrorMessage } from "../../lib/api-error";
import { Alert, AlertDescription } from "./alert";

interface FormErrorAlertProps {
  /** The mutation/query error (e.g. `mutation.error`). Renders nothing when falsy. */
  error: unknown;
  /** Shown when the backend gives no usable message. */
  fallback: string;
  className?: string;
}

/**
 * The single way every form surfaces a submit error: it reads the real backend
 * message via `getApiErrorMessage` and renders it in the shared destructive
 * Alert. Forms must not hand-roll their own error alert / generic string.
 */
export function FormErrorAlert({ error, fallback, className }: FormErrorAlertProps) {
  if (!error) {
    return null;
  }

  return (
    <Alert className={className} variant="destructive">
      <AlertDescription>{getApiErrorMessage(error, fallback)}</AlertDescription>
    </Alert>
  );
}
