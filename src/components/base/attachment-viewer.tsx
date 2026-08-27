import { useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { AttachmentKind } from "./attachment-kind";
import { buttonVariants } from "./button-variants";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { IconButton } from "./icon-button";

export interface AttachmentViewerItem {
  /** URL the browser can render inline (never a forced download). */
  url: string;
  /** URL that saves the file; defaults to `url` with `?download=1`. */
  downloadUrl?: string;
  kind: AttachmentKind;
  name: string;
}

export interface AttachmentViewerProps {
  /** Index of the open attachment, or null when the viewer is closed. */
  index: number | null;
  items: AttachmentViewerItem[];
  onIndexChange: (index: number | null) => void;
}

function downloadHref(item: AttachmentViewerItem): string {
  if (item.downloadUrl) return item.downloadUrl;
  return `${item.url}${item.url.includes("?") ? "&" : "?"}download=1`;
}

/**
 * Full view of an uploaded attachment: photos and PDFs are shown in place, and
 * saving the file stays a choice the reader makes rather than what a click does.
 * Formats no browser can render (Word) offer the download only.
 */
export function AttachmentViewer({
  index,
  items,
  onIndexChange,
}: AttachmentViewerProps) {
  const open = index !== null && index >= 0 && index < items.length;
  const item = open ? items[index] : null;
  const hasMany = items.length > 1;

  useEffect(() => {
    if (!open || !hasMany) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      // Paging must not steal the arrow keys from a control that needs them —
      // the caret in a field, or a native picker inside the framed document.
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      event.preventDefault();
      const step = event.key === "ArrowLeft" ? -1 : 1;
      onIndexChange((index! + step + items.length) % items.length);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [hasMany, index, items.length, onIndexChange, open]);

  if (!item) return null;

  return (
    <Dialog open onOpenChange={(next) => !next && onIndexChange(null)}>
      <DialogContent
        aria-label={item.name}
        className="max-h-[90vh] max-w-4xl overflow-y-auto"
        onClose={() => onIndexChange(null)}
      >
        <DialogHeader>
          <DialogTitle icon={FileText}>{item.name}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          {item.kind === "image" ? (
            <img
              alt={item.name}
              className="mx-auto max-h-[60vh] w-auto max-w-full rounded-lg bg-slate-50 object-contain"
              src={item.url}
            />
          ) : null}

          {item.kind === "pdf" ? (
            <>
              {/* Phone browsers render a framed PDF as an unusable one-page
                  crop, so small screens get the full-tab route instead. */}
              <iframe
                className="hidden h-[60vh] w-full rounded-lg border border-slate-200 sm:block"
                src={item.url}
                title={item.name}
              />
              <UnviewableNotice
                className="sm:hidden"
                description="เปิดในแท็บใหม่เพื่อดูแบบเต็มหน้าจอ หรือดาวน์โหลดเก็บไว้"
                title="ดูไฟล์ PDF บนมือถือได้ที่แท็บใหม่"
              />
            </>
          ) : null}

          {item.kind === "file" ? (
            <UnviewableNotice
              description="ดาวน์โหลดเพื่อเปิดด้วยโปรแกรมเอกสาร"
              title="ไฟล์ชนิดนี้เปิดดูในเบราว์เซอร์ไม่ได้"
            />
          ) : null}

          {/* Paging sits under the file, not floating on top of it: on a phone
              the content is full-width and overlaid arrows cover it. */}
          {hasMany ? (
            <div className="mt-4 flex items-center justify-center gap-4">
              <IconButton
                aria-label="ไฟล์ก่อนหน้า"
                icon={ChevronLeft}
                onClick={() =>
                  onIndexChange((index! - 1 + items.length) % items.length)
                }
                size="sm"
                variant="outline"
              />
              <span className="text-sm font-semibold text-slate-600">
                ไฟล์ที่ {index! + 1} จาก {items.length}
              </span>
              <IconButton
                aria-label="ไฟล์ถัดไป"
                icon={ChevronRight}
                onClick={() => onIndexChange((index! + 1) % items.length)}
                size="sm"
                variant="outline"
              />
            </div>
          ) : null}
        </DialogBody>

        <DialogFooter>
          {/* A Word file is served as an attachment, so "open in a new tab"
              would just be a second download button — offer it only for what
              the browser can actually display. */}
          {item.kind === "file" ? null : (
            <a
              className={cn(buttonVariants({ variant: "outline", size: "md" }))}
              href={item.url}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              เปิดในแท็บใหม่
            </a>
          )}
          <a
            className={cn(buttonVariants({ size: "md" }))}
            download={item.name}
            href={downloadHref(item)}
          >
            <Download className="size-4" aria-hidden="true" />
            ดาวน์โหลด
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Mirrors `EmptyState` from the layout primitives — components/base must not
 * depend on components/layout, so the canonical empty treatment is repeated
 * here rather than imported across that boundary.
 */
function UnviewableNotice({
  className,
  description,
  title,
}: {
  className?: string;
  description: string;
  title: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white px-8 py-12 text-center",
        className,
      )}
    >
      <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-slate-50">
        <FileText className="size-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="mb-2 text-lg font-bold text-slate-800">{title}</h2>
      <p className="mx-auto max-w-sm text-sm leading-relaxed text-slate-500">
        {description}
      </p>
    </div>
  );
}
