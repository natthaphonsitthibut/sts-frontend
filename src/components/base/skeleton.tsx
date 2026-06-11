import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

/**
 * Skeleton — central loading placeholder primitive.
 * Every loading state in the app is built from this block so motion, tone and
 * radius stay identical system-wide. Compose several to mirror real content.
 */
export type SkeletonProps = ComponentProps<"div">;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200/80", className)}
      aria-hidden="true"
      {...props}
    />
  );
}
