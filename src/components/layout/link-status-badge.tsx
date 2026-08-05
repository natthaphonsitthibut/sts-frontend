import { Badge, type BadgeProps } from "../base";
import { cn } from "../../lib/utils";

export interface LinkStatusBadgeProps {
  label: string;
  variant: BadgeProps["variant"];
  className?: string;
}

/**
 * Shared status badge for every link table (login links, attendance/visit
 * links). Fixed width + centred text so toggling open/closed — labels of
 * different glyph counts — never changes the cell width and shifts the table.
 */
export function LinkStatusBadge({ label, variant, className }: LinkStatusBadgeProps) {
  return (
    <Badge variant={variant} className={cn("w-[96px] justify-center", className)}>
      {label}
    </Badge>
  );
}
