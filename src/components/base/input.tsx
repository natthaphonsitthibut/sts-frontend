import type { ChangeEvent, ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { IconButton } from "./icon-button";

export type InputProps = ComponentProps<"input">;

const NATIVE_DATE_INPUT_TYPES = new Set([
  "date",
  "datetime-local",
  "month",
  "time",
  "week",
]);

/**
 * Native date/time inputs render their value through the OS control, which some
 * browsers (WebKit/iOS) tint with the platform default instead of our
 * `text-slate-900` — leaving faint or invisible digits on the white field. Pin
 * the light color-scheme and force the fill color so date fields read the same
 * as every other input, defined once here instead of duplicated per page.
 */
const NATIVE_DATE_INPUT_CLASS =
  "[color-scheme:light] [-webkit-text-fill-color:#0f172a] [&::-webkit-datetime-edit]:text-slate-900 [&::-webkit-datetime-edit-day-field]:text-slate-900 [&::-webkit-datetime-edit-month-field]:text-slate-900 [&::-webkit-datetime-edit-year-field]:text-slate-900";

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      className={cn(
        "box-border flex h-10 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-5 text-slate-900 transition-colors placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100 aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:border-red-400 aria-[invalid=true]:focus:ring-red-400/20",
        NATIVE_DATE_INPUT_TYPES.has(type) && NATIVE_DATE_INPUT_CLASS,
        className,
      )}
      type={type}
      {...props}
    />
  );
}

export type NumericInputProps = Omit<InputProps, "type" | "inputMode">;

/**
 * Digits-only input: blocks letters/symbols as they are typed (and on paste)
 * so number fields can never hold non-numeric data. Stays compatible with
 * react-hook-form's uncontrolled `register()` by sanitising the change event
 * before forwarding it.
 */
export function NumericInput({ onChange, maxLength, ...props }: NumericInputProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const digits = event.target.value.replace(/\D/g, "");
    const next =
      typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
    if (event.target.value !== next) {
      event.target.value = next;
    }
    onChange?.(event);
  }

  return (
    <Input
      inputMode="numeric"
      maxLength={maxLength}
      onChange={handleChange}
      {...props}
    />
  );
}

export interface PasswordInputProps extends Omit<InputProps, "type"> {
  visibilityButtonClassName?: string;
  visibilityIconClassName?: string;
  visibilityLabel?: string;
}

export function PasswordInput({
  className,
  visibilityButtonClassName,
  visibilityIconClassName,
  visibilityLabel = "แสดงหรือซ่อนรหัสผ่าน",
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        className={cn("pr-11", className)}
        type={visible ? "text" : "password"}
        {...props}
      />
      <IconButton
        aria-label={visibilityLabel}
        className={cn(
          "absolute right-1 top-1/2 size-8 -translate-y-1/2 border-transparent bg-inherit text-slate-500 shadow-none hover:bg-primary-soft hover:text-primary",
          visibilityButtonClassName,
        )}
        icon={Icon}
        iconClassName={visibilityIconClassName}
        onClick={() => setVisible((current) => !current)}
        tabIndex={-1}
        variant="ghost"
      />
    </div>
  );
}
