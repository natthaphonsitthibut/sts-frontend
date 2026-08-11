import { ChevronRight } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../../lib/utils";

interface AraIdPrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  showArrow?: boolean;
}

export function AraIdPrimaryButton({
  children,
  className,
  showArrow = false,
  ...props
}: AraIdPrimaryButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-araid-brand-mid px-6 py-3 text-base font-semibold text-white transition-[filter,transform] duration-150 ease-out hover:brightness-105 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-araid-brand disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {showArrow ? <ChevronRight aria-hidden="true" className="size-5" strokeWidth={2.2} /> : null}
    </button>
  );
}
