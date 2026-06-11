import type { ComponentProps, ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { IconButton } from "./icon-button";

export interface SheetProps extends ComponentProps<"div"> {
  onOpenChange?: (open: boolean) => void;
  open: boolean;
  position?: "left" | "right";
}

export function Sheet({
  children,
  className,
  onOpenChange,
  open,
  position = "left",
  ...props
}: SheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden" {...props}>
      <button
        aria-label="Close navigation"
        className="absolute inset-0 bg-slate-950/40 animate-overlay-in"
        onClick={() => onOpenChange?.(false)}
        type="button"
      />
      <aside
        className={cn(
          "absolute top-0 h-full w-72 max-w-[85vw] bg-white shadow-xl animate-sheet-in-left",
          position === "left" ? "left-0" : "right-0",
          className,
        )}
      >
        {children}
      </aside>
    </div>
  );
}

export interface SheetHeaderProps extends ComponentProps<"div"> {
  heading: ReactNode;
  onClose?: () => void;
}

export function SheetHeader({
  className,
  heading,
  onClose,
  ...props
}: SheetHeaderProps) {
  return (
    <div
      className={cn(
        "flex h-16 items-center justify-between border-b border-slate-200 px-4",
        className,
      )}
      {...props}
    >
      <div className="text-sm font-semibold text-slate-900">{heading}</div>
      {onClose ? (
        <IconButton aria-label="Close navigation" icon={X} onClick={onClose} />
      ) : null}
    </div>
  );
}

export function SidebarContainer({
  className,
  ...props
}: ComponentProps<"aside">) {
  return (
    <aside
      className={cn(
        "hidden h-full w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col",
        className,
      )}
      {...props}
    />
  );
}
