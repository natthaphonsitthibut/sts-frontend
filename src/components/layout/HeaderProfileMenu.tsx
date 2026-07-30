import { useRef, useState } from "react";
import { ChevronDown, LogOut, UserCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar } from "../base";
import { authService } from "../../features/auth/api/auth.service";
import { useAuthSessionStore } from "../../features/auth/store/auth-session.store";
import { useDismissable } from "../../hooks/useDismissable";
import { cn } from "../../lib/utils";

interface HeaderProfileMenuProps {
  canEditProfile: boolean;
  displayName: string;
  initials: string;
}

export function HeaderProfileMenu({
  canEditProfile,
  displayName,
  initials,
}: HeaderProfileMenuProps) {
  const navigate = useNavigate();
  const clearSession = useAuthSessionStore((state) => state.clearSession);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function getMenuItems(): HTMLElement[] {
    return Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [],
    );
  }

  function focusMenuEdge(edge: "first" | "last"): void {
    requestAnimationFrame(() => {
      const items = getMenuItems();
      items[edge === "first" ? 0 : items.length - 1]?.focus();
    });
  }

  useDismissable(open, rootRef, (reason) => {
    setOpen(false);
    // Escape means the keyboard user is still "at" the trigger — put focus back
    // there; an outside press moves focus wherever the user pressed instead.
    if (reason === "escape") triggerRef.current?.focus();
  });

  async function handleLogout(): Promise<void> {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      // The local session must still be cleared when the server is unavailable.
    }
    clearSession();
    void navigate("/login");
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-controls="header-profile-menu"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="เปิดเมนูบัญชีผู้ใช้"
        className={cn(
          "group flex min-h-10 items-center gap-2 rounded-full px-1.5 text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-44 sm:px-2",
          open && "bg-surface-app hover:bg-surface-app",
        )}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          setOpen(true);
          focusMenuEdge(event.key === "ArrowDown" ? "first" : "last");
        }}
      >
        <Avatar fallback={initials} className="size-9 bg-primary-soft font-semibold text-primary" />
        <span
          className={cn(
            "hidden min-w-0 flex-1 truncate text-sm sm:block",
            open ? "font-semibold text-primary" : "font-medium text-slate-600 group-hover:text-slate-900",
          )}
        >
          {displayName}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "hidden size-4 transition-transform sm:block",
            open ? "rotate-180 text-primary" : "text-slate-400 group-hover:text-slate-600",
          )}
        />
      </button>

      {open ? (
        <div
          ref={menuRef}
          id="header-profile-menu"
          role="menu"
          aria-label="บัญชีผู้ใช้"
          className="absolute inset-x-0 top-full z-50 mt-2 max-sm:min-w-48 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 shadow-lg"
          onKeyDown={(event) => {
            if (event.key === "Tab") {
              setOpen(false);
              return;
            }
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;

            event.preventDefault();
            const items = getMenuItems();
            if (items.length === 0) return;
            if (event.key === "Home" || event.key === "End") {
              items[event.key === "Home" ? 0 : items.length - 1]?.focus();
              return;
            }

            const currentIndex = items.indexOf(document.activeElement as HTMLElement);
            const direction = event.key === "ArrowDown" ? 1 : -1;
            const nextIndex = (currentIndex + direction + items.length) % items.length;
            items[nextIndex]?.focus();
          }}
        >
          {canEditProfile ? (
            <Link
              role="menuitem"
              className="flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setOpen(false)}
              to="/profile"
            >
              <UserCircle className="size-5 text-slate-500" aria-hidden="true" />
              โปรไฟล์ของฉัน
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
          >
            <LogOut className="size-5" aria-hidden="true" />
            {loggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
