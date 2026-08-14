import type { ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { Eye, type LucideIcon } from "lucide-react";
import type { VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { buttonVariants, iconButtonVariants } from "../base";
import { useContextualNavigationState } from "./navigation-context";

export interface DetailLinkButtonProps
  extends Omit<LinkProps, "children">,
    Pick<VariantProps<typeof buttonVariants>, "variant" | "size"> {
  children?: ReactNode;
  iconOnly?: boolean;
  icon?: LucideIcon;
  iconClassName?: string;
}

/**
 * Standard "ดูรายละเอียด" row action shared across every table. A router Link
 * styled as an outline button so the view action looks and sizes identically to
 * its sibling action buttons (h-9 / sm) instead of a bare text link — keeping
 * anchor semantics (open-in-new-tab, keyboard) rather than an onClick button.
 */
export function DetailLinkButton({
  className,
  icon: Icon = Eye,
  iconClassName,
  iconOnly = false,
  variant,
  size = "sm",
  state,
  children = "ดูรายละเอียด",
  ...props
}: DetailLinkButtonProps) {
  const contextualState = useContextualNavigationState(state);
  return (
    <Link
      className={cn(
        iconOnly
          ? iconButtonVariants({ variant: "view", size: "md" })
          : buttonVariants({ variant: variant ?? "outline", size }),
        "shrink-0 whitespace-nowrap",
        className,
      )}
      state={contextualState}
      {...props}
    >
      <Icon className={cn("size-4", iconClassName)} aria-hidden="true" />
      {iconOnly ? null : children}
    </Link>
  );
}
