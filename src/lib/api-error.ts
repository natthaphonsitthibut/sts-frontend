import { AxiosError } from "axios";

/**
 * Shape NestJS returns for HTTP exceptions. `message` is a single string for
 * thrown exceptions (NotFound/Forbidden/…) but a string[] for class-validator
 * failures via the global ValidationPipe, so callers must handle both.
 */
interface BackendErrorBody {
  message?: string | string[];
  error?: string;
}

function firstNonEmpty(values: string[]): string {
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return "";
}

/**
 * The one place that turns a thrown request error into a user-facing message.
 * Surfaces the real backend message (including the first field-level validation
 * error) so forms stop showing generic "ตรวจสอบข้อมูลแล้วลองอีกครั้ง" text.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const body = error.response?.data as BackendErrorBody | undefined;
    const raw = body?.message;

    if (Array.isArray(raw)) {
      const message = firstNonEmpty(raw.map((item) => String(item)));
      if (message) {
        return message;
      }
    } else if (typeof raw === "string" && raw.trim()) {
      return raw.trim();
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}
