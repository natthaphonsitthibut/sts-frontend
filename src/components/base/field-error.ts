import type { FieldError, FieldErrors, FieldValues } from "react-hook-form";

/**
 * Resolve a field error by path, including nested/array paths like
 * "guardians.0.full_name" that a flat `errors[name]` lookup misses.
 */
export function resolveFieldError<TFieldValues extends FieldValues>(
  errors: FieldErrors<TFieldValues>,
  path: string,
): FieldError | undefined {
  const value = path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[key]
          : undefined,
      errors,
    );
  return value && typeof value === "object" && "message" in value
    ? (value as FieldError)
    : undefined;
}
