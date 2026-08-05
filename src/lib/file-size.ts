/** Human-readable file size for upload previews and attachment chips. */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  const megabytes = bytes / (1024 * 1024);
  return megabytes >= 1
    ? `${megabytes.toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
