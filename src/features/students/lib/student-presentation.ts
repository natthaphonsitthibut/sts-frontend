import type { CSSProperties } from "react";

const AVATAR_COLOR_PAIRS = [
  ["#6366f1", "#8b5cf6"],
  ["#ec4899", "#f43f5e"],
  ["#14b8a6", "#06b6d4"],
  ["#f59e0b", "#f97316"],
  ["#10b981", "#22c55e"],
  ["#3b82f6", "#0ea5e9"],
  ["#8b5cf6", "#a855f7"],
  ["#ef4444", "#f97316"],
] as const;

export function getStudentAvatarGradient(name: string): CSSProperties {
  if (!name) {
    return { background: "#ccc", color: "#fff" };
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

export function formatStudentRoom(room: string | null | undefined): string {
  if (!room || room === "0") {
    return "-";
  }
  return `ห้อง ${room}`;
}
