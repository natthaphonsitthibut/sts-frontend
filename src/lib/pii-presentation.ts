const MASK_GLYPH = "•";

/** Sensitive values remain revealable in page memory for five minutes only. */
export const PII_REVEAL_TTL_MS = 5 * 60 * 1_000;

export function maskSensitiveIdentifier(
  value: string | null | undefined,
): string {
  const compactValue = value?.replace(/[\s-]/g, "") ?? "";
  return compactValue ? MASK_GLYPH.repeat(compactValue.length) : "";
}

/**
 * Fully mask a national identifier. Password fields remain native password
 * controls; no sensitive identifier retains a visible suffix.
 */
export function maskNationalId(value: string | null | undefined): string {
  return maskSensitiveIdentifier(value);
}
