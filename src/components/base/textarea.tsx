import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export type TextareaProps = ComponentProps<"textarea">;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:border-red-400 aria-[invalid=true]:focus:ring-red-400/20",
        className,
      )}
      {...props}
    />
  );
}
