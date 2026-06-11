import type { ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { IconButton } from "./icon-button";

export type InputProps = ComponentProps<"input">;

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60",
        className,
      )}
      type={type}
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
