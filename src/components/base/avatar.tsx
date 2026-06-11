import type { ComponentProps } from "react";
import { UserRound } from "lucide-react";
import { cn } from "../../lib/utils";

export interface AvatarProps extends ComponentProps<"div"> {
  fallback?: string;
  imageAlt?: string;
  imageUrl?: string | null;
}

export function Avatar({
  className,
  fallback,
  imageAlt = "",
  imageUrl,
  ...props
}: AvatarProps) {
  return (
    <div
      className={cn(
        "relative flex size-10 shrink-0 overflow-hidden rounded-full bg-slate-200 text-sm font-semibold text-slate-700",
        className,
      )}
      {...props}
    >
      {imageUrl ? (
        <img
          alt={imageAlt}
          className="h-full w-full object-cover"
          src={imageUrl}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center">
          {fallback ? (
            fallback.slice(0, 2).toUpperCase()
          ) : (
            <UserRound className="size-5" aria-hidden="true" />
          )}
        </span>
      )}
    </div>
  );
}
