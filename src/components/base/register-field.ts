import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";
import { resolveFieldError } from "./field-error";

/**
 * Register a field AND wire `aria-invalid` from its current error, so the base
 * Input/Select/Textarea turn red automatically. Spread it instead of
 * `form.register(name)`. The shared `Form` scrolls to the first invalid field
 * on submit, so the page also jumps to what is missing.
 */
export function registerField<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  name: FieldPath<TFieldValues>,
) {
  return {
    ...form.register(name),
    "aria-invalid": resolveFieldError(form.formState.errors, name)
      ? true
      : undefined,
  };
}
