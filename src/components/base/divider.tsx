import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export interface DividerProps extends ComponentProps<"div"> {
  label?: string;
}

export function Divider({ className, label, ...props }: DividerProps) {
  if (label) {
    return (
      <div className={cn("flex items-center text-sm font-medium text-slate-400", className)} {...props}>
        <div className="h-px flex-1 bg-slate-100" />
        <span className="px-4">{label}</span>
        <div className="h-px flex-1 bg-slate-100" />
      </div>
    );
  }

  return <div className={cn("h-px w-full bg-slate-100", className)} {...props} />;
}
