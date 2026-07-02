export function addressTextValue(value: string | number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

export function joinAddressParts(parts: Array<string | null | undefined>): string {
  return parts.map((part) => part?.trim()).filter(Boolean).join(" ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stripAddressPrefix(prefix: string, value: string | number | null | undefined): string {
  const normalized = addressTextValue(value);
  if (!normalized) return "";
  return normalized.replace(new RegExp(`^${escapeRegExp(prefix.trim())}\\s*`, "u"), "").trim();
}

export function prefixedAddressPart(
  prefix: string,
  value: string | number | null | undefined,
): string {
  const bareValue = stripAddressPrefix(prefix, value);
  return bareValue ? `${prefix}${bareValue}` : "";
}
