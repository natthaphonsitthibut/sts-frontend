export type AttachmentKind = "image" | "pdf" | "file";

/** What a stored file can be shown as, decided by its extension. */
export function attachmentKindOf(path: string): AttachmentKind {
  if (/\.(?:jpe?g|png|webp|gif)$/i.test(path)) return "image";
  if (/\.pdf$/i.test(path)) return "pdf";
  return "file";
}
