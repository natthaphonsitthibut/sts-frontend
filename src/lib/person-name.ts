/** Presentation helpers for a person's name — distinct from address formatting. */

export function joinNameParts(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

export function getNameInitials(name: string | null | undefined, fallback = "U"): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length >= 2) {
    return `${Array.from(parts[0])[0] ?? ""}${Array.from(parts[1])[0] ?? ""}`.toUpperCase();
  }
  if (parts.length === 1) {
    return (Array.from(parts[0])[0] ?? fallback).toUpperCase();
  }
  return fallback;
}
