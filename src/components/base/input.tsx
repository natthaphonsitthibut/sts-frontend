import type { ChangeEvent, ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { IconButton } from "./icon-button";

export type InputProps = ComponentProps<"input">;

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:border-red-400 aria-[invalid=true]:focus:ring-red-400/20",
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
  visibilityLabel?: string;
}

export function PasswordInput({
  className,
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
        className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-slate-500 hover:bg-transparent hover:text-primary"
        icon={Icon}
        onClick={() => setVisible((current) => !current)}
        tabIndex={-1}
        variant="ghost"
      />
    </div>
  );
}
