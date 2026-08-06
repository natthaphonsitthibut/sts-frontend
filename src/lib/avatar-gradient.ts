import type { CSSProperties } from "react";

// Single avatar palette for every initials avatar in the app (students, staff,
// attendance rosters). Deterministic per name so an avatar keeps its color.
// Pairs reference the brand token set (src/index.css @theme) instead of
// arbitrary hex so the identity palette stays on-brand as those tokens evolve.
const AVATAR_COLOR_PAIRS = [
  ["var(--color-primary)", "var(--color-brand-purple)"],
  ["var(--color-brand-purple)", "var(--color-brand-red-alt)"],
  ["var(--color-success)", "var(--color-primary)"],
  ["var(--color-brand-orange)", "var(--color-brand-red-alt)"],
  ["var(--color-danger)", "var(--color-brand-orange)"],
  ["var(--color-primary-dark)", "var(--color-brand-purple)"],
] as const;

export function getAvatarGradient(name: string): CSSProperties {
  if (!name) {
    return { background: "var(--color-avatar-neutral)", color: "#fff" };
  }

  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }

  const colorPair =
    AVATAR_COLOR_PAIRS[Math.abs(hash) % AVATAR_COLOR_PAIRS.length] ??
    AVATAR_COLOR_PAIRS[0];

  return {
    background: `linear-gradient(135deg, ${colorPair[0]}, ${colorPair[1]})`,
    color: "white",
    textShadow: "0 1px 2px rgba(0,0,0,0.2)",
  };
}
