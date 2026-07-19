import type { ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { Eye } from "lucide-react";
import type { VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { buttonVariants } from "../base";

export interface DetailLinkButtonProps
  extends Omit<LinkProps, "children">,
    Pick<VariantProps<typeof buttonVariants>, "variant" | "size"> {
  children?: ReactNode;
  iconOnly?: boolean;
}

/**
 * Standard "ดูรายละเอียด" row action shared across every table. A router Link
 * styled as an outline button so the view action looks and sizes identically to
 * its sibling action buttons (h-9 / sm) instead of a bare text link — keeping
 * anchor semantics (open-in-new-tab, keyboard) rather than an onClick button.
 */
export function DetailLinkButton({
  className,
  iconOnly = false,
  variant,
  size = "sm",
  children = "ดูรายละเอียด",
  ...props
}: DetailLinkButtonProps) {
  return (
    <Link
      className={cn(
        buttonVariants({ variant: variant ?? "outline", size }),
        "shrink-0 whitespace-nowrap",
        iconOnly && "size-9 px-0 hover:bg-slate-50",
        className,
      )}
      {...props}
    >
      <Eye className="size-4" aria-hidden="true" />
      {iconOnly ? null : children}
    </Link>
  );
}
