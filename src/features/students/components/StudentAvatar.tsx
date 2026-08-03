import { Avatar } from "../../../components/base";

interface StudentAvatarProps {
  name: string;
}

/** Thin wrapper kept for call-site readability — the look lives in {@link Avatar}. */
export function StudentAvatar({ name }: StudentAvatarProps) {
  return <Avatar fallback={name?.[0] || "?"} gradientName={name} />;
}
