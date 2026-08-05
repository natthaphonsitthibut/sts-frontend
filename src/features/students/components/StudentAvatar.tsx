import { Avatar } from "../../../components/base";
import { resolveApiMediaUrl } from "../../../lib/media-url";

interface StudentAvatarProps {
  name: string;
  /** App-relative photo path from the API; the letter fallback shows without one. */
  photoUrl?: string | null;
  className?: string;
}

/** Thin wrapper kept for call-site readability — the look lives in {@link Avatar}. */
export function StudentAvatar({ className, name, photoUrl }: StudentAvatarProps) {
  return (
    <Avatar
      className={className}
      fallback={name?.[0] || "?"}
      gradientName={name}
      imageAlt={name}
      imageUrl={resolveApiMediaUrl(photoUrl ?? null)}
    />
  );
}
