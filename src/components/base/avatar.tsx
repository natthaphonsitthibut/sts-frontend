import { useState, type ComponentProps, type CSSProperties } from "react";
import { UserRound } from "lucide-react";
import { getAvatarGradient } from "../../lib/avatar-gradient";
import { cn } from "../../lib/utils";

export interface AvatarProps extends ComponentProps<"div"> {
  fallback?: string;
  imageAlt?: string;
  imageUrl?: string | null;
  /**
   * Person's display name. Renders the shared deterministic colour gradient
   * behind their initial whenever no photo is set — the same treatment the
   * classroom roster uses, so an avatar keeps one identity across the app.
   * Leave unset for avatars that carry a fixed brand colour instead.
   */
  gradientName?: string;
}

export function Avatar({
  className,
  fallback,
  gradientName,
  imageAlt = "",
  imageUrl,
  style,
  ...props
}: AvatarProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const activeImageUrl = imageUrl && imageUrl !== failedImageUrl ? imageUrl : null;
  // Opt in by presence, not truthiness: an empty name still resolves to the
  // palette's neutral colour rather than falling back to the plain grey chip.
  const useGradient = !activeImageUrl && gradientName !== undefined;
  const initial = fallback ?? gradientName?.charAt(0) ?? "";
  const gradientStyle: CSSProperties | undefined = useGradient
    ? getAvatarGradient(gradientName!)
    : undefined;

  return (
    <div
      data-slot="avatar"
      className={cn(
        "relative flex size-10 shrink-0 overflow-hidden rounded-full bg-slate-200 text-sm font-semibold text-slate-700",
        useGradient && "font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.15)]",
        className,
      )}
      style={gradientStyle ? { ...gradientStyle, ...style } : style}
      {...props}
    >
      {activeImageUrl ? (
        <img
          alt={imageAlt}
          className="h-full w-full object-cover"
          data-avatar-image
          onError={() => setFailedImageUrl(activeImageUrl)}
          src={activeImageUrl}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center">
          {initial ? (
            initial.slice(0, 2).toUpperCase()
          ) : (
            <UserRound className="size-5" aria-hidden="true" />
          )}
        </span>
      )}
    </div>
  );
}
