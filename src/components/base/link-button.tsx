import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export type LinkButtonProps = ComponentProps<"button">;

/**
 * A button that reads as a link: an in-place action sitting next to a label,
 * where a filled or outlined button would out-weigh the control it belongs to.
 * Matches the inline link treatment used elsewhere so the two are indistinct.
 */
export function LinkButton({ className, type = "button", ...props }: LinkButtonProps) {
  return (
    <button
      className={cn(
        "rounded-sm text-sm font-semibold text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      type={type}
      {...props}
    />
  );
}
