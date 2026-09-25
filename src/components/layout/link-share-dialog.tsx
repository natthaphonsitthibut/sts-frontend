import { useState, type ReactNode } from "react";
import {
  Check,
  Ellipsis,
  LoaderCircle,
  MessageCircle,
  Share2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  appToast,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  IconButton,
  Input,
} from "../base";

/**
 * Send the link straight to its one recipient through the system's LINE —
 * "ส่งลิงก์ผ่าน LINE" — as opposed to แชร์ผ่าน LINE, which opens the viewer's
 * own LINE to pick someone. Shown only where the link has a known recipient.
 */
export interface LinkDirectSend {
  /** Who it goes to, e.g. the assigned teacher's name. */
  recipient: string;
  /** Why it cannot send right now; null when it can. */
  unavailableReason: string | null;
  busy?: boolean;
  /** When the last send reached the recipient, already formatted. */
  sentAtLabel?: string | null;
  onSend: () => void;
}

interface LinkShareDialogProps {
  description?: ReactNode;
  directSend?: LinkDirectSend;
  link: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title?: string;
}

interface LinkShareButtonProps {
  className?: string;
  directSend?: LinkDirectSend;
  compact?: boolean;
  disabled?: boolean;
  link?: string | null;
}

interface LinkSharePanelProps {
  directSend?: LinkDirectSend;
  disabled?: boolean;
  link: string;
}

function openShareTarget(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

async function copyLink(link: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    appToast.error("คัดลอกลิงก์ไม่สำเร็จ");
    return false;
  }
}

function ShareChoice({
  children,
  disabled = false,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="group flex min-w-0 flex-col items-center gap-2 rounded-lg p-2 text-center text-xs text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-primary"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="inline-flex transition-transform duration-150 ease-out group-hover:scale-110 motion-reduce:transform-none">
        {children}
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

export function LinkShareDialog({
  description,
  directSend,
  link,
  onOpenChange,
  open,
  title = "แชร์",
}: LinkShareDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      {/* text-left: the dialog renders inside whatever holds the button — a
          centred table action cell included — and must not inherit it. */}
      <DialogContent
        className="max-w-md text-left"
        onClose={() => onOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle icon={Share2}>{title}</DialogTitle>
          {description ? (
            <div className="text-sm text-slate-600">{description}</div>
          ) : null}
        </DialogHeader>

        <LinkSharePanel directSend={directSend} link={link} />
      </DialogContent>
    </Dialog>
  );
}

/** Shared inline content so QR pages and dialogs present the same share UI. */
export function LinkSharePanel({
  directSend,
  disabled = false,
  link,
}: LinkSharePanelProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    if (!(await copyLink(link))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  // Straight to the Messenger inbox with the link on the clipboard, same shape
  // as Discord below. `facebook.com/sharer` is never used here — that is the
  // *feed* sharer and composes a public post instead of a chat.
  async function handleMessenger(): Promise<void> {
    if (!(await copyLink(link))) return;
    appToast.info("คัดลอกลิงก์แล้ว วางใน Messenger ได้เลย");
    openShareTarget("https://www.facebook.com/messages/");
  }

  async function handleDiscord(): Promise<void> {
    if (!(await copyLink(link))) return;
    appToast.info("คัดลอกลิงก์แล้ว วางใน Discord ได้เลย");
    openShareTarget("https://discord.com/channels/@me");
  }

  async function handleMore(): Promise<void> {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "แชร์ลิงก์", url: link });
      } catch {
        // Native share dismissal is intentional and needs no error feedback.
      }
      return;
    }
    if (await copyLink(link)) {
      appToast.success("คัดลอกลิงก์แล้ว");
    }
  }

  return (
    <div
      className={
        disabled ? "pointer-events-none space-y-5 opacity-40" : "space-y-5"
      }
    >
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-700">คัดลอกลิงก์</div>
        <div className="flex items-center gap-2">
          <Input
            aria-label="ลิงก์ที่จะแชร์"
            className="min-w-0 flex-1 text-sm"
            disabled={disabled}
            readOnly
            value={link}
          />
          <Button
            aria-label={copied ? "คัดลอกแล้ว" : "คัดลอก"}
            className="w-[88px] shrink-0"
            disabled={disabled}
            icon={copied ? Check : undefined}
            iconClassName={copied ? "text-white" : undefined}
            onClick={() => void handleCopy()}
            size="md"
          >
            {copied ? null : "คัดลอก"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-700">แชร์ผ่าน</div>
        <div
          className={
            directSend ? "grid grid-cols-6 gap-2" : "grid grid-cols-5 gap-3"
          }
        >
          <ShareChoice
            disabled={disabled}
            label="LINE"
            onClick={() =>
              openShareTarget(
                `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(link)}`,
              )
            }
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-line shadow-sm">
              <img alt="" className="size-8" src="/brand-icons/line.svg" />
            </span>
          </ShareChoice>
          {/* ส่งถึงครู, beside LINE: straight to the one recipient through the
              system's LINE, in the teacher-link page's green (owner,
              2026-09-25) — unlike LINE, which opens the viewer's own app. */}
          {directSend ? (
            <ShareChoice
              disabled={
                disabled ||
                directSend.unavailableReason !== null ||
                Boolean(directSend.busy)
              }
              label="ส่งถึงครู"
              onClick={directSend.onSend}
            >
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-xl bg-success text-white shadow-sm",
                  (directSend.unavailableReason !== null || directSend.busy) &&
                    "opacity-50",
                )}
                title={
                  directSend.unavailableReason ??
                  `ส่งลิงก์ถึง ${directSend.recipient} ผ่าน LINE`
                }
              >
                {directSend.busy ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-6 animate-spin"
                  />
                ) : (
                  <MessageCircle aria-hidden="true" className="size-6" />
                )}
              </span>
            </ShareChoice>
          ) : null}
          <ShareChoice
            disabled={disabled}
            label="Messenger"
            onClick={() => void handleMessenger()}
          >
            <img alt="" className="size-12" src="/brand-icons/messenger.svg" />
          </ShareChoice>
          <ShareChoice
            disabled={disabled}
            label="Gmail"
            onClick={() =>
              openShareTarget(
                `https://mail.google.com/mail/?view=cm&fs=1&body=${encodeURIComponent(link)}`,
              )
            }
          >
            <span className="flex size-12 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
              <img alt="" className="h-7 w-9" src="/brand-icons/gmail.svg" />
            </span>
          </ShareChoice>
          <ShareChoice
            disabled={disabled}
            label="Discord"
            onClick={() => void handleDiscord()}
          >
            <span className="flex size-12 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
              <img alt="" className="h-7 w-9" src="/brand-icons/discord.svg" />
            </span>
          </ShareChoice>
          <ShareChoice
            disabled={disabled}
            label="เพิ่มเติม"
            onClick={() => void handleMore()}
          >
            <span className="flex size-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm">
              <Ellipsis className="size-5" aria-hidden="true" />
            </span>
          </ShareChoice>
        </div>
        {directSend ? (
          <p className="text-xs text-slate-500">
            {directSend.unavailableReason
              ? `ส่งถึงครู: ${directSend.unavailableReason}`
              : directSend.sentAtLabel
                ? `ส่งถึง ${directSend.recipient} ทาง LINE แล้วเมื่อ ${directSend.sentAtLabel}`
                : `ส่งถึงครู: ส่งลิงก์ไปที่ LINE ของ ${directSend.recipient} ทันที`}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function LinkShareButton({
  className,
  compact = false,
  directSend,
  disabled = false,
  link,
}: LinkShareButtonProps) {
  const [open, setOpen] = useState(false);
  const unavailable = disabled || !link;
  return (
    <>
      {compact ? (
        <IconButton
          aria-label="แชร์ลิงก์"
          className={className}
          disabled={unavailable}
          icon={Share2}
          onClick={() => setOpen(true)}
          variant="share"
        />
      ) : (
        <Button
          aria-label="แชร์ลิงก์"
          className={className}
          disabled={unavailable}
          icon={Share2}
          onClick={() => setOpen(true)}
          size="sm"
          variant="outline"
        >
          แชร์
        </Button>
      )}
      {link ? (
        <LinkShareDialog
          directSend={directSend}
          link={link}
          onOpenChange={setOpen}
          open={open}
        />
      ) : null}
    </>
  );
}
