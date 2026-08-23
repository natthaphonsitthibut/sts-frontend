import { useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useDismissable } from "../../../hooks/useDismissable";
import { cn } from "../../../lib/utils";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationCenterPanel } from "./NotificationCenterPanel";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Keep the bell on the same query as the panel so the unread total cannot
  // diverge from the number the user sees after opening notifications.
  const { data } = useNotifications({ limit: 50 });

  useDismissable(open, rootRef, (reason) => {
    setOpen(false);
    // Escape means the keyboard user is still "at" the trigger — put focus back
    // there; an outside press moves focus wherever the user pressed instead.
    if (reason === "escape") triggerRef.current?.focus();
  });

  const unseenCount = data?.unseenCount ?? 0;
  const unreadCount = data?.unreadCount ?? 0;
  return (
    <div className="relative z-10" ref={rootRef}>
      <button
        ref={triggerRef}
        aria-controls="notification-center"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={
          unreadCount > 0
            ? `รายการแจ้งเตือน (ยังไม่อ่าน ${unreadCount} รายการ)`
            : "รายการแจ้งเตือน"
        }
        className={cn(
          "relative inline-flex size-10 items-center justify-center rounded-full bg-brand-soft text-primary-dark transition-colors hover:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          open && "bg-brand-active text-primary",
        )}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Bell
          aria-hidden="true"
          className={cn(
            "size-5",
            unseenCount > 0 &&
              !open &&
              "animate-notification-bell motion-reduce:animate-none",
          )}
          strokeWidth={2.1}
        />
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-400 px-1 text-xs font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
      <NotificationCenterPanel onOpenChange={setOpen} open={open} />
    </div>
  );
}
