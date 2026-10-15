/** Presentation helpers for a person's name — distinct from address formatting. */

export function joinNameParts(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

export function getNameInitials(
  name: string | null | undefined,
  fallback = "U",
): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length >= 2) {
    return `${Array.from(parts[0])[0] ?? ""}${Array.from(parts[1])[0] ?? ""}`.toUpperCase();
  }
  if (parts.length === 1) {
    return (Array.from(parts[0])[0] ?? fallback).toUpperCase();
  }
  return fallback;
}

// Leading titles that are not part of the name itself (นาย สมชาย → ส).
const NAME_TITLES = new Set([
  "นาย",
  "นาง",
  "นางสาว",
  "น.ส.",
  "เด็กชาย",
  "เด็กหญิง",
  "ด.ช.",
  "ด.ญ.",
  "mr.",
  "mrs.",
  "ms.",
  "miss",
]);

/** The one letter an avatar shows: the first letter of the name, skipping a title. */
export function getAvatarInitial(name: string | null | undefined): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const first =
    parts.length > 1 && NAME_TITLES.has(parts[0].toLowerCase())
      ? parts[1]
      : parts[0];
  return first ? (Array.from(first)[0] ?? "") : "";
}
