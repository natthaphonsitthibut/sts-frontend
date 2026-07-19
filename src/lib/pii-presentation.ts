const MASK_GLYPH = "•";

/**
 * Fully mask a national identifier. Password fields remain native password
 * controls; no sensitive identifier retains a visible suffix.
 */
export function maskNationalId(value: string | null | undefined): string {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) return "";
  return MASK_GLYPH.repeat(digits.length);
}
