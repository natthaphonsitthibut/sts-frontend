import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export type TextareaProps = ComponentProps<"textarea">;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
