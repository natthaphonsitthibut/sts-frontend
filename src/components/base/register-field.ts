import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";
import type { ChangeEvent } from "react";
import { keepDigits } from "../../lib/validation";
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

/**
 * `registerField` for a digits-only value (เลขบัตรประชาชน, เบอร์โทร): anything
 * that is not a digit is dropped as it is typed or pasted, so the field can
 * never hold letters for the validator to complain about afterwards.
 */
export function registerDigitsField<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  name: FieldPath<TFieldValues>,
) {
  const field = registerField(form, name);
  return {
    ...field,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      const digits = keepDigits(event.target.value);
      if (digits !== event.target.value) event.target.value = digits;
      return field.onChange(event);
    },
  };
}
